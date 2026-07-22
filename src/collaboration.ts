import { startTransition, useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { normalizeFlowCrud } from "./features/dfd/dfd";
import type { CanvasAnnotation, CanvasType, SaveAnnotation } from "./features/annotations/types";
import type { CanvasModelPlacement, DataDomain, DfdState, DomainCategory, ErdCanvas, ExportSettings, NamingPolicy, RefinementResult, Relationship, RelationshipReference, VocabularyEntry } from "./features/modeling/types";
import { applyAutomaticMaturityToState, applyDurableOperation, applyEphemeralOperation } from "./collaboration/hostState";
import { durableState, isDurableOperation, type CollaborationState, type Collaborator, type DurableOperation, type DurableState, type Operation, type RelayJoinResult, type RelayMessage } from "./collaboration/types";
import { chooseProjectDirectory } from "./persistence/projectDocument";
import { hasWailsBridge } from "./persistence/wailsBridge";
import { usesGoServer, usesWailsDesktop } from "./runtime";
import { loadNativeSeedOverrides } from "./persistence/nativeSeeds";
import { PersistenceClient, type CatalogView, type OpfsProject, type PersistenceSession } from "./persistence/persistenceClient";
import { useWebRtcSharing } from "./collaboration/webrtc/useWebRtcSharing";
import { clearParticipantCheckpoint, saveParticipantCheckpoint, type ParticipantRecoveryCandidate } from "./collaboration/webrtc/participantCheckpoint";
import { ensureStateTimestamps, MonotonicTimer, timestampDurableOperation } from "./collaboration/timestamp";
import { LocalTabSession } from "./collaboration/localTabSession";
import { projectAlreadyOpenId } from "./persistence/persistenceClient";
import { normalizePlacementOwnership } from "./features/modeling/placements";
import { waitForStablePending } from "./collaboration/pending";

export type { Collaborator } from "./collaboration/types";

const colors = ["#e11d48", "#7c3aed", "#2563eb", "#0891b2", "#059669", "#ca8a04", "#ea580c", "#db2777"];
const pageClientId = crypto.randomUUID();

const defaultDfdState = (): DfdState => ({
  canvases: [{ id: "dfd-main", name: "Main data flow" }],
  nodes: [],
  flows: [],
  groups: [],
  crudMatrix: { orientation: "processes_rows", processOrder: [], modelOrder: [] }
});

function normalizeDfdState(raw: DfdState): DfdState {
  const legacyNodes = (raw.nodes ?? []) as Array<Omit<DfdState["nodes"][number], "kind" | "intermediateKind" | "physicalProcesses"> & { kind: string; intermediateKind?: string; physicalProcesses?: Array<string | { id: string; name: string }> }>;
  const nodes = legacyNodes.map((node) => ({
    ...node,
    kind: node.kind === "logical-process" ? "process" as const : node.kind as DfdState["nodes"][number]["kind"],
    processKind: node.kind === "logical-process" ? node.processKind ?? "batch" : node.processKind,
    intermediateKind: node.intermediateKind === "api-payload" ? "file" as const : node.intermediateKind === "stream" ? "queue" as const : node.intermediateKind as DfdState["nodes"][number]["intermediateKind"],
    physicalProcesses: node.physicalProcesses?.map((physical, index) => typeof physical === "string" ? { id: `${node.definitionId}:physical:${index}`, name: physical } : physical)
  }));
  const groups = raw.groups ?? [];
  return { canvases: raw.canvases, nodes, groups, flows: (raw.flows ?? []).map((flow) => normalizeFlowCrud(flow, nodes, groups)), crudMatrix: raw.crudMatrix ?? { orientation: "processes_rows", processOrder: [], modelOrder: [] } };
}

function defaultExportSettings() {
  return {
    nameDisplayMode: "business" as const,
    cardDisplayMode: "description" as const,
    crudOrientation: "processes_rows" as const,
    sqlDialect: "postgresql" as const
  };
}

function normalizeDurableState<T extends { id: string; x?: number; y?: number }>(state: DurableState<T>): DurableState<T> {
  return { ...state, placements: normalizePlacementOwnership(state.placements), exportSettings: state.exportSettings ?? defaultExportSettings(), dfd: state.dfd ?? defaultDfdState() };
}

function normalizeCollaborationState<T extends { id: string; x?: number; y?: number }>(state: DurableState<T>, users: Collaborator[], locks: Record<string, Collaborator> = {}): CollaborationState<T> {
  return { ...normalizeDurableState(state), users, locks };
}

function getIdentity() {
  const clientId = pageClientId;
  let name = localStorage.getItem("erdsketch-user-name")?.trim();
  if (!name) {
    name = `Modeler ${clientId.slice(0, 4)}`;
    localStorage.setItem("erdsketch-user-name", name);
  }
  return { id: clientId, name, color: colors[Math.floor(Math.random() * colors.length)], x: 0, y: 0, online: true, canvasId: "main", canvasType: "erd" as const };
}

async function post(path: string, body: unknown) {
  return fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

function initialState<T extends { id: string; x?: number; y?: number }>(me: Collaborator, seeds: T[], relationships: Relationship[], references: RelationshipReference[], domains: DataDomain[], domainCategories: DomainCategory[]): CollaborationState<T> {
  return {
    canvases: [{ id: "main", name: "Main canvas" }],
    placements: seeds.map((seed, index) => ({ canvasId: "main", seedId: seed.id, x: seed.x ?? 80 + index * 40, y: seed.y ?? 60 + index * 30, accessMode: "owner" })),
    seeds,
    relationships,
    relationshipReferences: references,
    domains,
    domainCategories,
    namingPolicy: {
      tablePluralization: "singular",
      tableJoinMode: "separator", tableSeparator: "_",
      fieldJoinMode: "separator", fieldSeparator: "_",
      domainJoinMode: "concatenate", domainSeparator: "_"
    },
    exportSettings: {
      nameDisplayMode: "business",
      cardDisplayMode: "description",
      crudOrientation: "processes_rows",
      sqlDialect: "postgresql"
    },
    vocabularyEntries: [],
    dfd: defaultDfdState(),
    users: [me],
    locks: {},
    annotations: []
  };
}

type RecoveryStatus = Pick<PersistenceSession<unknown>, "recoveredOperations" | "ignoredTailRecords" | "persistentStorage"> & { ready: boolean; error?: string };

type CollaborationOptions<T> = {
  initialInvitationToken?: string;
  initialParticipantRecovery?: ParticipantRecoveryCandidate<T>;
};

export function useCollaboration<T extends { id: string; x?: number; y?: number }>(initialSeeds: T[], initialRelationships: Relationship[] = [], initialReferences: RelationshipReference[] = [], initialDomains: DataDomain[] = [], initialDomainCategories: DomainCategory[] = [], options: CollaborationOptions<T> = {}) {
  const [me, setMe] = useState<Collaborator>(getIdentity);
  const [state, setState] = useState<CollaborationState<T>>(() => options.initialParticipantRecovery?.checkpoint?.state
    ? normalizeCollaborationState(structuredClone(options.initialParticipantRecovery.checkpoint.state), [me])
    : initialState(me, initialSeeds, initialRelationships, initialReferences, initialDomains, initialDomainCategories));
  const [connected, setConnected] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [hasParticipantSnapshot, setHasParticipantSnapshot] = useState(Boolean(options.initialParticipantRecovery?.checkpoint));
  const [participantRecoveryResolved, setParticipantRecoveryResolved] = useState(false);
  const [participantSnapshotReadOnly, setParticipantSnapshotReadOnly] = useState(false);
  const [isLocalTabParticipant, setIsLocalTabParticipant] = useState(false);
  const [localTabConnectionError, setLocalTabConnectionError] = useState<string>();
  const [nativeFileSystemAvailable, setNativeFileSystemAvailable] = useState(false);
  const [projects, setProjects] = useState<OpfsProject[]>([]);
  const [activeProject, setActiveProject] = useState<OpfsProject | null>(null);
  const [recoveryStatus, setRecoveryStatus] = useState<RecoveryStatus>({ ready: false, recoveredOperations: 0, ignoredTailRecords: 0, persistentStorage: false });
  const stateRef = useRef(state);
  const confirmedStateRef = useRef(state);
  const roleRef = useRef<"host" | "participant">("participant");
  const relayAvailableRef = useRef(false);
  const persistenceRef = useRef<PersistenceClient<T> | null>(null);
  const activeProjectRef = useRef<OpfsProject | null>(null);
  const projectsRef = useRef<OpfsProject[]>([]);
  const initialProjectStateRef = useRef(durableState(state));
  const durableWritesBlockedRef = useRef(false);
  const participantSnapshotReadOnlyRef = useRef(false);
  const projectDirectoryRef = useRef<FileSystemDirectoryHandle | null>(null);
  const sequenceRef = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const commitQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const pendingRequestsRef = useRef(new Map<string, (accepted: boolean) => void>());
  const cursorFrameRef = useRef<number | undefined>(undefined);
  const pendingCursorRef = useRef<{ x: number; y: number } | undefined>(undefined);
  const webRtcAvailableRef = useRef(false);
  const webRtcSendRef = useRef<(message: Omit<RelayMessage<T>, "senderId">) => Promise<boolean>>(async () => false);
  const localTabSessionRef = useRef<LocalTabSession<T> | null>(null);
  const localTabAvailableRef = useRef(false);
  const timestampTimerRef = useRef(new MonotonicTimer());

  const replaceVisibleState = useCallback((next: CollaborationState<T>) => {
    stateRef.current = next;
    startTransition(() => setState(next));
  }, []);

  const replaceProjectCatalogView = useCallback((view: CatalogView) => {
    activeProjectRef.current = view.activeProject;
    projectsRef.current = view.projects;
    startTransition(() => {
      setProjects(view.projects);
      setActiveProject(view.activeProject);
    });
  }, []);

  const installPersistenceSession = useCallback((session: PersistenceSession<T>, users: Collaborator[]) => {
    const next = applyAutomaticMaturityToState<T>(normalizeCollaborationState(session.state, users));
    sequenceRef.current = session.sequence;
    confirmedStateRef.current = next;
    replaceVisibleState(next);
    replaceProjectCatalogView(session);
    if (localTabAvailableRef.current && roleRef.current === "host") localTabSessionRef.current?.host(session.activeProject.projectId);
    startTransition(() => setRecoveryStatus({
      ready: true,
      recoveredOperations: session.recoveredOperations,
      ignoredTailRecords: session.ignoredTailRecords,
      persistentStorage: session.persistentStorage
    }));
    return next;
  }, [replaceProjectCatalogView, replaceVisibleState]);

  const sendRelay = useCallback(async (message: Omit<RelayMessage<T>, "senderId">) => {
    const localTabSent = localTabAvailableRef.current && (localTabSessionRef.current?.send(message) ?? false);
    const webRtcSent = await webRtcSendRef.current(message).catch(() => false);
    let relaySent = false;
    if (relayAvailableRef.current) {
      const response = await post("/api/relay/message", { clientId: me.id, message }).catch(() => undefined);
      relaySent = response?.ok ?? false;
    }
    return localTabSent || webRtcSent || relaySent || roleRef.current === "host";
  }, [me.id]);

  const publishState = useCallback(async (kind: "operation_accepted" | "state_snapshot", requestId?: string, targetId?: string) => {
    await sendRelay({ kind, messageId: requestId, targetId, payload: { requestId, sequence: sequenceRef.current, state: confirmedStateRef.current, project: activeProjectRef.current ?? undefined, projects: projectsRef.current } });
  }, [sendRelay]);

  const commitHostNow = useCallback(async (operation: Operation<T>, requestId: string, actorID: string, targetID?: string) => {
    try {
      const current = confirmedStateRef.current;
      let next: CollaborationState<T>;
      if (isDurableOperation(operation)) {
        const acceptedOperation = timestampDurableOperation(current, operation, timestampTimerRef.current);
        const persistence = persistenceRef.current;
        if (!persistence) throw new Error("recovery storage is not ready");
        if (durableWritesBlockedRef.current) throw new Error("durable changes are paused because recovery storage failed");
        next = applyDurableOperation(current, acceptedOperation, actorID);
        let committed: Awaited<ReturnType<PersistenceClient<T>["append"]>>;
        try {
          committed = await persistence.append(acceptedOperation, requestId, sequenceRef.current);
        } catch (error) {
          durableWritesBlockedRef.current = true;
          setRecoveryStatus((status) => ({ ...status, error: error instanceof Error ? error.message : String(error) }));
          try {
            const recovered = await persistence.initialize(structuredClone(initialProjectStateRef.current));
            installPersistenceSession(recovered, current.users);
            durableWritesBlockedRef.current = false;
            if (await persistence.hasMessage(requestId)) {
              await publishState("operation_accepted", requestId);
              return true;
            }
          } catch (recoveryError) {
            setRecoveryStatus((status) => ({ ...status, error: recoveryError instanceof Error ? recoveryError.message : String(recoveryError) }));
          }
          throw error;
        }
        if (committed.duplicate) {
          sequenceRef.current = committed.sequence;
          await publishState("operation_accepted", requestId, targetID);
          return true;
        }
        sequenceRef.current = committed.sequence;
        confirmedStateRef.current = next;
        replaceVisibleState(next);
        await publishState("operation_accepted", requestId);
        if (committed.shouldCheckpoint) void persistence.checkpoint(durableState(next)).catch((error: unknown) => setRecoveryStatus((status) => ({ ...status, error: error instanceof Error ? error.message : String(error) })));
      } else {
        next = applyEphemeralOperation(current, operation, actorID);
        confirmedStateRef.current = next;
        replaceVisibleState(next);
        await publishState("operation_accepted", requestId);
      }
      return true;
    } catch (error) {
      await sendRelay({ kind: "operation_rejected", messageId: requestId, targetId: targetID ?? actorID, payload: { requestId, error: error instanceof Error ? error.message : String(error) } });
      replaceVisibleState(confirmedStateRef.current);
      return false;
    }
  }, [installPersistenceSession, publishState, replaceVisibleState, sendRelay]);

  const commitHost = useCallback((operation: Operation<T>, requestId: string, actorID: string, targetID?: string) => {
    const task = () => commitHostNow(operation, requestId, actorID, targetID);
    const result = commitQueueRef.current.then(task, task);
    commitQueueRef.current = result.then(() => undefined, () => undefined);
    return result;
  }, [commitHostNow]);

  const dispatch = useCallback(async (operation: Operation<T>) => {
    if (participantSnapshotReadOnlyRef.current) return false;
    const requestId = crypto.randomUUID();
    if (roleRef.current === "host") return commitHost(operation, requestId, me.id);
    if (!connected || (!relayAvailableRef.current && !webRtcAvailableRef.current && !localTabAvailableRef.current)) return false;
    const accepted = new Promise<boolean>((resolve) => {
      const timer = window.setTimeout(() => {
        pendingRequestsRef.current.delete(requestId);
        resolve(false);
      }, 10_000);
      pendingRequestsRef.current.set(requestId, (value) => {
        window.clearTimeout(timer);
        resolve(value);
      });
    });
    if (!(await sendRelay({ kind: "operation_intent", messageId: requestId, payload: { requestId, operation } }))) {
      pendingRequestsRef.current.get(requestId)?.(false);
      pendingRequestsRef.current.delete(requestId);
    }
    return accepted;
  }, [commitHost, connected, me.id, sendRelay]);

  const handleRelayMessage = useEffectEvent((message: RelayMessage<T>) => {
    if (roleRef.current === "host") {
      if (message.kind === "operation_intent") {
        const payload = message.payload as { requestId?: string; operation?: Operation<T> } | undefined;
        if (payload?.requestId && payload.operation) void commitHost(payload.operation, payload.requestId, message.senderId, message.senderId);
      } else if (message.kind === "participant_joined") {
        const user = message.payload as Collaborator;
        const current = confirmedStateRef.current;
        const users = [...current.users.filter((item) => item.id !== user.id), user];
        confirmedStateRef.current = { ...current, users };
        replaceVisibleState(confirmedStateRef.current);
        void publishState("state_snapshot", undefined, user.id);
      } else if (message.kind === "participant_left") {
        const { clientId } = message.payload as { clientId: string };
        const current = confirmedStateRef.current;
        const locks = Object.fromEntries(Object.entries(current.locks).filter(([, owner]) => owner.id !== clientId));
        confirmedStateRef.current = { ...current, users: current.users.filter((user) => user.id !== clientId), locks };
        replaceVisibleState(confirmedStateRef.current);
        void publishState("state_snapshot");
      }
      return;
    }
    if (message.kind === "operation_accepted" || message.kind === "state_snapshot") {
      const payload = message.payload as { requestId?: string; sequence?: number; state?: CollaborationState<T>; project?: OpfsProject; projects?: OpfsProject[] } | undefined;
      if (payload?.state) {
        payload.state.dfd = normalizeDfdState(payload.state.dfd?.canvases?.length ? payload.state.dfd : defaultDfdState());
        confirmedStateRef.current = payload.state;
        sequenceRef.current = payload.sequence ?? sequenceRef.current;
        replaceVisibleState(payload.state);
        if (roleRef.current === "participant") {
          setHasParticipantSnapshot(true);
          saveParticipantCheckpoint(payload.state, sequenceRef.current, payload.project);
        }
      }
      if (payload?.project) {
        activeProjectRef.current = payload.project;
        if (payload.projects) projectsRef.current = payload.projects;
        startTransition(() => {
          setActiveProject(payload.project ?? null);
          if (payload.projects) setProjects(payload.projects);
        });
      }
      if (payload?.requestId) {
        pendingRequestsRef.current.get(payload.requestId)?.(true);
        pendingRequestsRef.current.delete(payload.requestId);
      }
    } else if (message.kind === "operation_rejected") {
      const payload = message.payload as { requestId?: string } | undefined;
      if (payload?.requestId) {
        pendingRequestsRef.current.get(payload.requestId)?.(false);
        pendingRequestsRef.current.delete(payload.requestId);
      }
      replaceVisibleState(confirmedStateRef.current);
    }
  });

  const handleParticipantConnectionChange = useCallback((nextConnected: boolean) => {
    setConnected(nextConnected);
  }, []);

  const sharing = useWebRtcSharing<T>({
    me,
    initialInvitationToken: options.initialInvitationToken,
    onMessage: handleRelayMessage,
    onParticipantConnectionChange: handleParticipantConnectionChange,
    sendRef: webRtcSendRef,
    availableRef: webRtcAvailableRef
  });

  const initializeHost = useCallback(async (users: Collaborator[], isCancelled: () => boolean) => {
    let current = confirmedStateRef.current;
    if (relayAvailableRef.current || usesWailsDesktop()) {
      try {
        const overrides = await loadNativeSeedOverrides();
        const byID = new Map(overrides.map((seed) => [seed.id, seed]));
        const seeds = current.seeds.map((seed) => ({ ...seed, ...byID.get(seed.id) }));
        const placements = current.placements.map((placement) => {
          const override = byID.get(placement.seedId);
          return override ? { ...placement, x: override.x ?? placement.x, y: override.y ?? placement.y } : placement;
        });
        current = { ...current, seeds, placements };
      } catch {
        // Bundled seed data remains the static-mode and backend-read fallback.
      }
    }
    const timestamped = ensureStateTimestamps(durableState(current), timestampTimerRef.current);
    current = { ...timestamped, users: current.users, locks: current.locks };
    initialProjectStateRef.current = durableState(current);
    persistenceRef.current?.dispose();
    const persistence = new PersistenceClient<T>();
    persistenceRef.current = persistence;
    const recovered = await persistence.initialize(durableState(current));
    if (isCancelled() || persistenceRef.current !== persistence) {
      persistence.dispose();
      return false;
    }
    durableWritesBlockedRef.current = false;
    installPersistenceSession(recovered, users);
    return true;
  }, [installPersistenceSession]);

  useEffect(() => {
    let cancelled = false;
    let localTabSession: LocalTabSession<T> | null = null;
    const createLocalTabSession = () => {
      if (localTabSession) return localTabSession;
      localTabSession = new LocalTabSession<T>(me.id, handleRelayMessage, () => {
        localTabAvailableRef.current = false;
        participantSnapshotReadOnlyRef.current = true;
        for (const resolve of pendingRequestsRef.current.values()) resolve(false);
        pendingRequestsRef.current.clear();
        startTransition(() => {
          setConnected(false);
          setIsLocalTabParticipant(false);
          setParticipantSnapshotReadOnly(true);
          setLocalTabConnectionError("The host tab closed or stopped responding. Reload to reopen the project after its editing lock is released.");
        });
      });
      localTabSessionRef.current = localTabSession;
      return localTabSession;
    };
    const join = async () => {
      if (options.initialInvitationToken || options.initialParticipantRecovery) {
        relayAvailableRef.current = false;
        setNativeFileSystemAvailable(false);
        roleRef.current = "participant";
        setIsHost(false);
        setConnected(false);
        return;
      }
      try {
        if (!usesGoServer()) throw new Error("server runtime disabled");
        const response = await post("/api/relay/join", { clientId: me.id, user: me });
        if (!response.ok) throw new Error("relay unavailable");
        const joined = await response.json() as RelayJoinResult;
        if (cancelled) return;
        relayAvailableRef.current = true;
        setNativeFileSystemAvailable(true);
        roleRef.current = joined.role;
        setIsHost(joined.role === "host");
        const users = joined.participants.map((participant) => participant.user);
        confirmedStateRef.current = { ...confirmedStateRef.current, users };
        replaceVisibleState(confirmedStateRef.current);
        if (joined.role === "host" && !(await initializeHost(users, () => cancelled))) return;
        if (cancelled) return;
        const events = new EventSource(`/api/relay/events?clientId=${encodeURIComponent(me.id)}`);
        eventSourceRef.current = events;
        events.onmessage = (event) => handleRelayMessage(JSON.parse(event.data) as RelayMessage<T>);
        events.onopen = () => {
          setConnected(true);
          if (roleRef.current === "host") void publishState("state_snapshot");
          else void sendRelay({ kind: "operation_intent", messageId: crypto.randomUUID(), payload: { requestId: crypto.randomUUID(), operation: { type: "presence", patch: {} } } });
        };
        events.onerror = () => setConnected(false);
      } catch {
        if (cancelled) return;
        relayAvailableRef.current = false;
        setNativeFileSystemAvailable(hasWailsBridge());
        roleRef.current = "host";
        setIsHost(true);
        try {
          if (!(await initializeHost([me], () => cancelled))) return;
          if (cancelled) return;
          const projectId = activeProjectRef.current?.projectId;
          if (!projectId) throw new Error("Active OPFS project is not ready");
          try {
            const local = createLocalTabSession();
            local.host(projectId);
            localTabAvailableRef.current = true;
          } catch {
            localTabAvailableRef.current = false;
          }
          setIsLocalTabParticipant(false);
          setLocalTabConnectionError(undefined);
          setConnected(true);
        } catch (error) {
          if (cancelled) return;
          const openProjectId = projectAlreadyOpenId(error);
          if (openProjectId) {
            persistenceRef.current?.dispose();
            persistenceRef.current = null;
            let joined = false;
            try {
              joined = await createLocalTabSession().join(openProjectId, me);
            } catch {
              error = new Error("This browser cannot connect tabs for shared local editing. Close the other tab before opening this project.");
            }
            if (cancelled) return;
            if (joined) {
              localTabAvailableRef.current = true;
              roleRef.current = "participant";
              startTransition(() => {
                setIsHost(false);
                setConnected(true);
                setIsLocalTabParticipant(true);
                setLocalTabConnectionError(undefined);
                setNativeFileSystemAvailable(false);
                setRecoveryStatus({ ready: true, recoveredOperations: 0, ignoredTailRecords: 0, persistentStorage: false });
              });
              return;
            }
            if (!(error instanceof Error) || projectAlreadyOpenId(error)) error = new Error("This project has an editing owner, but its host tab did not respond. Retry after the host finishes loading, or close the other tab.");
          }
          startTransition(() => {
            setRecoveryStatus({ ready: false, recoveredOperations: 0, ignoredTailRecords: 0, persistentStorage: false, error: error instanceof Error ? error.message : String(error) });
            setConnected(false);
          });
        }
      }
    };
    void join();
    return () => {
      cancelled = true;
      eventSourceRef.current?.close();
      persistenceRef.current?.dispose();
      persistenceRef.current = null;
      localTabAvailableRef.current = false;
      localTabSession?.close();
      if (localTabSessionRef.current === localTabSession) localTabSessionRef.current = null;
      if (cursorFrameRef.current !== undefined) cancelAnimationFrame(cursorFrameRef.current);
    };
  }, [initializeHost, me.id, options.initialInvitationToken, options.initialParticipantRecovery, publishState, replaceVisibleState, sendRelay]);

  useEffect(() => {
    if (!isLocalTabParticipant) return;
    const confirmLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = true;
    };
    window.addEventListener("beforeunload", confirmLeave);
    return () => window.removeEventListener("beforeunload", confirmLeave);
  }, [isLocalTabParticipant]);

  const participantRecovery = !participantRecoveryResolved
    ? options.initialParticipantRecovery
      ? {
          reason: "This participant tab was reloaded after its Co-work connection was lost.",
          hasSnapshot: Boolean(options.initialParticipantRecovery.checkpoint),
          updatedAt: options.initialParticipantRecovery.checkpoint?.updatedAt ?? options.initialParticipantRecovery.marker.updatedAt
        }
      : sharing.participantDisconnectReason
        ? {
            reason: sharing.participantDisconnectReason,
            hasSnapshot: hasParticipantSnapshot,
            updatedAt: sharing.participantDisconnectedAt ?? Date.now()
          }
        : undefined
    : undefined;

  const viewParticipantSnapshot = useCallback(() => {
    if (!hasParticipantSnapshot && !options.initialParticipantRecovery?.checkpoint) return false;
    sharing.detachParticipant();
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    relayAvailableRef.current = false;
    webRtcAvailableRef.current = false;
    participantSnapshotReadOnlyRef.current = true;
    for (const resolve of pendingRequestsRef.current.values()) resolve(false);
    pendingRequestsRef.current.clear();
    startTransition(() => {
      setConnected(false);
      setIsHost(false);
      setParticipantSnapshotReadOnly(true);
      setParticipantRecoveryResolved(true);
    });
    return true;
  }, [hasParticipantSnapshot, options.initialParticipantRecovery, sharing.detachParticipant]);

  const abandonParticipantRecovery = useCallback(() => {
    sharing.detachParticipant();
    clearParticipantCheckpoint();
    setParticipantRecoveryResolved(true);
  }, [sharing.detachParticipant]);

  const rename = useCallback(async (name: string) => {
    const normalized = name.trim();
    if (!normalized) return false;
    localStorage.setItem("erdsketch-user-name", normalized);
    setMe((current) => ({ ...current, name: normalized }));
    return dispatch({ type: "presence", patch: { name: normalized } });
  }, [dispatch]);

  const moveCursor = useCallback((x: number, y: number) => {
    pendingCursorRef.current = { x, y };
    if (cursorFrameRef.current !== undefined) return;
    cursorFrameRef.current = requestAnimationFrame(() => {
      cursorFrameRef.current = undefined;
      if (pendingCursorRef.current) void dispatch({ type: "presence", patch: pendingCursorRef.current });
    });
  }, [dispatch]);

  const changeCanvas = useCallback(async (canvasId: string, canvasType: CanvasType = "erd") => {
    setMe((current) => ({ ...current, canvasId, canvasType }));
    return dispatch({ type: "presence", patch: { canvasId, canvasType } });
  }, [dispatch]);

  const updateAnnotationPresence = useCallback(async (selectionId = "", editingAnnotationId = "") => {
    setMe((current) => ({ ...current, selectionId, editingAnnotationId }));
    return dispatch({ type: "presence", patch: { selectionId, editingAnnotationId } });
  }, [dispatch]);

  const updateModelEditingPresence = useCallback(async (editingModelId = "") => {
    setMe((current) => ({ ...current, editingModelId }));
    return dispatch({ type: "presence", patch: { editingModelId } });
  }, [dispatch]);

  const lockAll = useCallback((seedIds: string[]) => dispatch({ type: "lock", seedIds: [...new Set(seedIds)] }), [dispatch]);
  const lock = useCallback((seedId: string) => lockAll([seedId]), [lockAll]);
  const unlockAll = useCallback(async (seedIds: string[]) => { await dispatch({ type: "unlock", seedIds: [...new Set(seedIds)] }); }, [dispatch]);
  const unlock = useCallback(async (seedId: string) => { await unlockAll([seedId]); }, [unlockAll]);

  const saveSeed = useCallback((seed: T, create = false, canvasId = "main") => dispatch({ type: "seed", seed, create, canvasId }), [dispatch]);
  const saveCatalogSeed = useCallback((seed: T, create = false) => dispatch({ type: "seed", seed, create, canvasId: "main", catalog: true }), [dispatch]);
  const savePlacement = useCallback((placement: CanvasModelPlacement, create = false) => dispatch({ type: "placement", placement, create }), [dispatch]);
  const removeModel = useCallback((seedId: string, canvasId: string) => dispatch({ type: "remove_model", seedId, canvasId }), [dispatch]);
  const saveCanvas = useCallback((canvas: ErdCanvas, create = false) => dispatch({ type: "canvas", canvas, create }), [dispatch]);
  const saveDfd = useCallback((dfd: DfdState) => dispatch({ type: "dfd", dfd }), [dispatch]);
  const transferOwnership = useCallback((seedId: string, expectedOwnerId: string, targetCanvasId: string) => dispatch({ type: "ownership", seedId, expectedOwnerId, targetCanvasId }), [dispatch]);
  const saveDomain = useCallback((domain: DataDomain, options: { create?: boolean; delete?: boolean } = {}) => dispatch({ type: "domain", domain, create: options.create ?? false, delete: options.delete ?? false }), [dispatch]);
  const saveDomainCategory = useCallback((category: DomainCategory, create = false) => dispatch({ type: "domain_category", category, create }), [dispatch]);
  const saveNamingPolicy = useCallback((policy: NamingPolicy) => dispatch({ type: "naming_policy", policy }), [dispatch]);
  const saveExportSettings = useCallback((settings: ExportSettings) => dispatch({ type: "export_settings", settings }), [dispatch]);
  const saveVocabularyEntry = useCallback((entry: VocabularyEntry, options: { create?: boolean; delete?: boolean } = {}) => dispatch({ type: "vocabulary", entry, create: options.create ?? false, delete: options.delete ?? false }), [dispatch]);
  const saveRelationship = useCallback((relationship: Relationship, reference: RelationshipReference, options: { create?: boolean; delete?: boolean } = {}) => dispatch({ type: "relationship", relationship, reference, create: options.create ?? false, delete: options.delete ?? false }), [dispatch]);
  const saveRefinement = useCallback((result: RefinementResult) => dispatch({ type: "refinement", result }), [dispatch]);
  const saveAnnotation: SaveAnnotation = useCallback((annotation: CanvasAnnotation, options = {}) => dispatch({ type: "annotation", annotation, create: options.create ?? false, delete: options.delete ?? false }), [dispatch]);

  const activateProjectNow = useCallback(async (projectId: string, checkpointCurrent = true) => {
    const persistence = persistenceRef.current;
    if (!persistence) throw new Error("OPFS project catalog is not ready");
    if (activeProjectRef.current?.projectId === projectId) return true;
    const recovered = await persistence.activateProject(
      projectId,
      durableState(confirmedStateRef.current),
      structuredClone(initialProjectStateRef.current),
      checkpointCurrent
    );
    durableWritesBlockedRef.current = false;
    installPersistenceSession(recovered, confirmedStateRef.current.users);
    await publishState("state_snapshot");
    return true;
  }, [installPersistenceSession, publishState]);

  const runProjectTask = useCallback((task: () => Promise<boolean>) => {
    if (roleRef.current !== "host") return Promise.resolve(false);
    const result = commitQueueRef.current.then(task, task);
    commitQueueRef.current = result.then(() => undefined, () => undefined);
    return result;
  }, []);

  const waitForPendingDurableOperations = useCallback(async () => {
    await waitForStablePending(() => commitQueueRef.current);
    return !durableWritesBlockedRef.current;
  }, []);

  const failProjectTask = useCallback((error: unknown) => {
    startTransition(() => setRecoveryStatus((status) => ({ ...status, error: error instanceof Error ? error.message : String(error) })));
    return false;
  }, []);

  const loadOpfsProject = useCallback(async (projectId: string) => {
    if (roleRef.current === "participant" && isLocalTabParticipant) {
      if (activeProjectRef.current?.projectId === projectId) return true;
      const local = localTabSessionRef.current;
      if (!local) return false;
      const previousProjectId = activeProjectRef.current?.projectId;
      localTabAvailableRef.current = false;
      local.leaveProject();
      const persistence = new PersistenceClient<T>();
      persistenceRef.current = persistence;
      try {
        const recovered = await persistence.initialize(structuredClone(initialProjectStateRef.current), projectId);
        installPersistenceSession(recovered, [me]);
        roleRef.current = "host";
        local.host(projectId);
        localTabAvailableRef.current = true;
        participantSnapshotReadOnlyRef.current = false;
        startTransition(() => {
          setIsHost(true);
          setConnected(true);
          setIsLocalTabParticipant(false);
          setParticipantSnapshotReadOnly(false);
          setLocalTabConnectionError(undefined);
          setNativeFileSystemAvailable(hasWailsBridge());
        });
        return true;
      } catch (error) {
        persistence.dispose();
        if (persistenceRef.current === persistence) persistenceRef.current = null;
        const openProjectId = projectAlreadyOpenId(error);
        if (openProjectId && await local.join(openProjectId, me)) {
          localTabAvailableRef.current = true;
          roleRef.current = "participant";
          startTransition(() => {
            setIsHost(false);
            setConnected(true);
            setIsLocalTabParticipant(true);
            setLocalTabConnectionError(undefined);
            setNativeFileSystemAvailable(false);
            setRecoveryStatus({ ready: true, recoveredOperations: 0, ignoredTailRecords: 0, persistentStorage: false });
          });
          return true;
        }
        if (previousProjectId && await local.join(previousProjectId, me)) {
          localTabAvailableRef.current = true;
          roleRef.current = "participant";
        }
        return failProjectTask(error);
      }
    }
    return runProjectTask(async () => {
      try {
        return await activateProjectNow(projectId);
      } catch (error) {
        const openProjectId = projectAlreadyOpenId(error);
        const local = localTabSessionRef.current;
        if (openProjectId && local) {
          const previousProjectId = activeProjectRef.current?.projectId;
          localTabAvailableRef.current = false;
          local.leaveProject();
          if (await local.join(openProjectId, me)) {
            persistenceRef.current?.dispose();
            persistenceRef.current = null;
            localTabAvailableRef.current = true;
            roleRef.current = "participant";
            startTransition(() => {
              setIsHost(false);
              setConnected(true);
              setIsLocalTabParticipant(true);
              setLocalTabConnectionError(undefined);
              setNativeFileSystemAvailable(false);
              setRecoveryStatus({ ready: true, recoveredOperations: 0, ignoredTailRecords: 0, persistentStorage: false });
            });
            return true;
          }
          if (previousProjectId) {
            local.host(previousProjectId);
            localTabAvailableRef.current = true;
          }
          return failProjectTask(new Error("This project has an editing owner, but its host tab did not respond. Retry after the host finishes loading, or close the other tab."));
        }
        return failProjectTask(error);
      }
    });
  }, [activateProjectNow, failProjectTask, installPersistenceSession, isLocalTabParticipant, me, runProjectTask]);

  function leaveLocalTabSession() {
    if (!localTabSessionRef.current?.isParticipant()) return false;
    localTabSessionRef.current.leaveProject();
    localTabAvailableRef.current = false;
    participantSnapshotReadOnlyRef.current = true;
    for (const resolve of pendingRequestsRef.current.values()) resolve(false);
    pendingRequestsRef.current.clear();
    startTransition(() => {
      setConnected(false);
      setIsLocalTabParticipant(false);
      setParticipantSnapshotReadOnly(true);
    });
    return true;
  }

  const createOpfsProject = useCallback((displayName: string) => runProjectTask(async () => {
    const persistence = persistenceRef.current;
    if (!persistence) return false;
    try {
      const session = await persistence.createProject(displayName, durableState(confirmedStateRef.current), structuredClone(initialProjectStateRef.current));
      installPersistenceSession(session, confirmedStateRef.current.users);
      await publishState("state_snapshot");
      return true;
    } catch (error) {
      return failProjectTask(error);
    }
  }), [failProjectTask, installPersistenceSession, publishState, runProjectTask]);

  const createProjectFromStateNow = useCallback(async (displayName: string, projectState: DurableState<T>) => {
    const persistence = persistenceRef.current;
    if (!persistence) return false;
    try {
      const timestamped = ensureStateTimestamps(structuredClone(projectState), timestampTimerRef.current);
      const session = await persistence.createProjectFromState(displayName, durableState(confirmedStateRef.current), timestamped);
      installPersistenceSession(session, confirmedStateRef.current.users);
      await publishState("state_snapshot");
      return true;
    } catch (error) {
      return failProjectTask(error);
    }
  }, [failProjectTask, installPersistenceSession, publishState]);

  const createProjectFromState = useCallback((displayName: string, projectState: DurableState<T>) => runProjectTask(() => createProjectFromStateNow(displayName, projectState)), [createProjectFromStateNow, runProjectTask]);

  const importProjectAsNew = useCallback((file: File) => runProjectTask(async () => {
    const persistence = persistenceRef.current;
    if (!persistence) return false;
    try {
      const projectState = await persistence.decodeProjectFile(file);
      const displayName = file.name.replace(/\.erdsketch\.zip$|\.zip$/i, "").trim() || "Imported project";
      return createProjectFromStateNow(displayName, projectState);
    } catch (error) {
      return failProjectTask(error);
    }
  }), [createProjectFromStateNow, failProjectTask, runProjectTask]);

  const openNativeProjectAsNew = useCallback(() => runProjectTask(async () => {
    const persistence = persistenceRef.current;
    if (!persistence || !nativeFileSystemAvailable) return false;
    try {
      const projectId = activeProjectRef.current?.projectId ?? "project";
      const projectState = await persistence.loadNative(me.id, projectId);
      return projectState ? createProjectFromStateNow("Opened project", projectState) : false;
    } catch (error) {
      return failProjectTask(error);
    }
  }), [createProjectFromStateNow, failProjectTask, me.id, nativeFileSystemAvailable, runProjectTask]);

  const saveOpfsProjectAs = useCallback((displayName: string) => runProjectTask(async () => {
    const persistence = persistenceRef.current;
    if (!persistence) return false;
    try {
      const current = durableState(confirmedStateRef.current);
      const session = await persistence.saveAs(displayName, current);
      installPersistenceSession(session, confirmedStateRef.current.users);
      await publishState("state_snapshot");
      return true;
    } catch (error) {
      return failProjectTask(error);
    }
  }), [failProjectTask, installPersistenceSession, publishState, runProjectTask]);

  const renameOpfsProject = useCallback((projectId: string, displayName: string) => runProjectTask(async () => {
    const persistence = persistenceRef.current;
    if (!persistence) return false;
    try {
      const view = await persistence.renameProject(projectId, displayName);
      replaceProjectCatalogView(view);
      if (activeProjectRef.current?.projectId === projectId) await publishState("state_snapshot");
      return true;
    } catch (error) {
      return failProjectTask(error);
    }
  }), [failProjectTask, publishState, replaceProjectCatalogView, runProjectTask]);

  const deleteOpfsProject = useCallback((projectId: string) => runProjectTask(async () => {
    const persistence = persistenceRef.current;
    if (!persistence) return false;
    try {
      const session = await persistence.deleteProject(projectId, durableState(confirmedStateRef.current), structuredClone(initialProjectStateRef.current));
      installPersistenceSession(session, confirmedStateRef.current.users);
      await publishState("state_snapshot");
      return true;
    } catch (error) {
      return failProjectTask(error);
    }
  }), [failProjectTask, installPersistenceSession, publishState, runProjectTask]);

  const saveProject = useCallback(async () => {
    const persistence = persistenceRef.current;
    if (roleRef.current !== "host" || !persistence) return false;
    const current = durableState(confirmedStateRef.current);
    try {
      if (!relayAvailableRef.current && !projectDirectoryRef.current && window.showDirectoryPicker) projectDirectoryRef.current = await chooseProjectDirectory() ?? null;
      await persistence.checkpoint(current);
      const projectId = activeProjectRef.current?.projectId;
      if (!projectId) throw new Error("Active OPFS project is not ready");
      if (relayAvailableRef.current || usesWailsDesktop()) await persistence.saveNative(me.id, projectId, current);
      else if (projectDirectoryRef.current) await persistence.saveDirectory(projectDirectoryRef.current, projectId, current);
      else await persistence.downloadArchive(projectId, current);
      replaceProjectCatalogView(await persistence.touchProject(projectId));
      return true;
    } catch (error) {
      setRecoveryStatus((status) => ({ ...status, error: error instanceof Error ? error.message : String(error) }));
      return false;
    }
  }, [me.id, replaceProjectCatalogView]);

  const openProject = useCallback(async () => {
    if (roleRef.current !== "host") return false;
    try {
      const persistence = persistenceRef.current;
      if (!persistence) throw new Error("Recovery storage is not ready");
      let loaded: DurableState<T> | undefined;
      const projectId = activeProjectRef.current?.projectId;
      if (!projectId) throw new Error("Active OPFS project is not ready");
      if (relayAvailableRef.current || usesWailsDesktop()) loaded = await persistence.loadNative(me.id, projectId);
      else if (window.showDirectoryPicker) {
        projectDirectoryRef.current = await chooseProjectDirectory() ?? null;
        if (projectDirectoryRef.current) loaded = await persistence.loadDirectory(projectDirectoryRef.current, projectId);
      }
      if (!loaded) return false;
      return dispatch({ type: "replace_project", state: loaded });
    } catch (error) {
      setRecoveryStatus((status) => ({ ...status, error: error instanceof Error ? error.message : String(error) }));
      return false;
    }
  }, [dispatch, me.id]);

  const exportProject = useCallback(async () => {
    if (roleRef.current !== "host") return false;
    try {
      const persistence = persistenceRef.current;
      if (!persistence) throw new Error("Recovery storage is not ready");
      if (!(await waitForPendingDurableOperations())) throw new Error("Pending project changes could not be saved. Export was cancelled.");
      await persistence.checkpoint(durableState(confirmedStateRef.current));
      const projectId = activeProjectRef.current?.projectId;
      if (!projectId) throw new Error("Active OPFS project is not ready");
      await persistence.downloadArchive(projectId, durableState(confirmedStateRef.current));
      return true;
    } catch (error) {
      setRecoveryStatus((status) => ({ ...status, error: error instanceof Error ? error.message : String(error) }));
      return false;
    }
  }, [waitForPendingDurableOperations]);

  const createExportSnapshot = useCallback(async () => {
    if (!(await waitForPendingDurableOperations())) throw new Error("Pending project changes could not be saved. Export was cancelled.");
    const projectId = activeProjectRef.current?.projectId;
    if (!projectId) throw new Error("Active project is not ready");
    return JSON.stringify({ formatVersion: 1, projectId, documents: { "project.json": JSON.stringify(durableState(confirmedStateRef.current)) } });
  }, [waitForPendingDurableOperations]);

  const importProject = useCallback(async (file: File) => {
    if (roleRef.current !== "host") return false;
    try {
      const persistence = persistenceRef.current;
      if (!persistence) throw new Error("Recovery storage is not ready");
      return dispatch({ type: "replace_project", state: await persistence.decodeProjectFile(file) });
    } catch (error) {
      setRecoveryStatus((status) => ({ ...status, error: error instanceof Error ? error.message : String(error) }));
      return false;
    }
  }, [dispatch]);

  const setLocal = useCallback((update: (current: CollaborationState<T>) => CollaborationState<T>) => {
    if (participantSnapshotReadOnlyRef.current) return;
    const next = update(stateRef.current);
    stateRef.current = next;
    setState(next);
  }, []);
  const setLocalSeeds = useCallback((seeds: T[]) => setLocal((current) => ({ ...current, seeds })), [setLocal]);
  const setLocalPlacements = useCallback((placements: CanvasModelPlacement[]) => setLocal((current) => ({ ...current, placements })), [setLocal]);
  const setLocalCanvases = useCallback((canvases: ErdCanvas[]) => setLocal((current) => ({ ...current, canvases })), [setLocal]);
  const setLocalDfd = useCallback((dfd: DfdState) => setLocal((current) => ({ ...current, dfd })), [setLocal]);
  const setLocalRelationships = useCallback((relationships: Relationship[], relationshipReferences: RelationshipReference[]) => setLocal((current) => ({ ...current, relationships, relationshipReferences })), [setLocal]);
  const setLocalDomains = useCallback((domains: DataDomain[]) => setLocal((current) => ({ ...current, domains })), [setLocal]);
  const setLocalDomainCategories = useCallback((domainCategories: DomainCategory[]) => setLocal((current) => ({ ...current, domainCategories })), [setLocal]);
  const setLocalVocabularyEntries = useCallback((next: VocabularyEntry[] | ((current: VocabularyEntry[]) => VocabularyEntry[])) => setLocal((current) => ({ ...current, vocabularyEntries: typeof next === "function" ? next(current.vocabularyEntries) : next })), [setLocal]);
  const setLocalAnnotations = useCallback((next: CanvasAnnotation[] | ((current: CanvasAnnotation[]) => CanvasAnnotation[])) => setLocal((current) => ({ ...current, annotations: typeof next === "function" ? next(current.annotations) : next })), [setLocal]);

  return {
    me,
    ...state,
    connected,
    isHost,
    nativeFileSystemAvailable,
    projects,
    activeProject,
    recoveryStatus,
    sharing,
    participantRecovery,
    participantSnapshotReadOnly,
    isLocalTabParticipant,
    localTabConnectionError,
    leaveLocalTabSession,
    viewParticipantSnapshot,
    abandonParticipantRecovery,
    loadOpfsProject,
    createOpfsProject,
    createProjectFromState,
    importProjectAsNew,
    openNativeProjectAsNew,
    saveOpfsProjectAs,
    renameOpfsProject,
    deleteOpfsProject,
    saveProject,
    openProject,
    exportProject,
    createExportSnapshot,
    importProject,
    rename,
    changeCanvas,
    updateAnnotationPresence,
    updateModelEditingPresence,
    moveCursor,
    lock,
    unlock,
    lockAll,
    unlockAll,
    saveSeed,
    saveCanvas,
    saveDfd,
    saveCatalogSeed,
    savePlacement,
    removeModel,
    transferOwnership,
    saveRelationship,
    saveRefinement,
    saveDomain,
    saveDomainCategory,
    saveNamingPolicy,
    saveExportSettings,
    saveVocabularyEntry,
    saveAnnotation,
    setLocalSeeds,
    setLocalCanvases,
    setLocalDfd,
    setLocalPlacements,
    setLocalRelationships,
    setLocalDomains,
    setLocalDomainCategories,
    setLocalVocabularyEntries,
    setLocalAnnotations
  };
}
