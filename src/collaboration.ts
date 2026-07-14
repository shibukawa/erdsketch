import { startTransition, useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import type { CanvasModelPlacement, DataDomain, DfdState, DomainCategory, ErdCanvas, NamingPolicy, RefinementResult, Relationship, RelationshipReference, VocabularyEntry } from "./features/modeling/types";
import { normalizeFlowCrud } from "./features/dfd/dfd";

export type Collaborator = {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  online: boolean;
  canvasId: string;
};

type CollaborationState<T> = {
  canvases: ErdCanvas[];
  placements: CanvasModelPlacement[];
  seeds: T[];
  relationships: Relationship[];
  relationshipReferences: RelationshipReference[];
  domains: DataDomain[];
  domainCategories: DomainCategory[];
  namingPolicy: NamingPolicy;
  vocabularyEntries: VocabularyEntry[];
  dfd: DfdState;
  users: Collaborator[];
  locks: Record<string, Collaborator>;
};

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
  const flows = (raw.flows ?? []).map((flow) => normalizeFlowCrud(flow, nodes, groups));
  return { canvases: raw.canvases, nodes, flows, groups, crudMatrix: raw.crudMatrix ?? { orientation: "processes_rows", processOrder: [], modelOrder: [] } };
}

const colors = ["#e11d48", "#7c3aed", "#2563eb", "#0891b2", "#059669", "#ca8a04", "#ea580c", "#db2777"];

function randomItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function getIdentity() {
  let clientId = sessionStorage.getItem("erdsketch-client-id");
  if (!clientId) {
    clientId = crypto.randomUUID();
    sessionStorage.setItem("erdsketch-client-id", clientId);
  }
  const name = localStorage.getItem("erdsketch-user-name") ?? "";
  return { user: { id: clientId, name, color: randomItem(colors), x: 0, y: 0, online: true, canvasId: "main" }, assignAvailableName: !name };
}

async function post(path: string, body: unknown) {
  return fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function useCollaboration<T extends { id: string; x?: number; y?: number }>(initialSeeds: T[], initialRelationships: Relationship[] = [], initialReferences: RelationshipReference[] = [], initialDomains: DataDomain[] = [], initialDomainCategories: DomainCategory[] = []) {
  const [identity] = useState(getIdentity);
  const [me, setMe] = useState<Collaborator>(identity.user);
  const [state, setState] = useState<CollaborationState<T>>({
    canvases: [{ id: "main", name: "Main canvas" }],
    placements: initialSeeds.map((seed, index) => ({ canvasId: "main", seedId: seed.id, x: seed.x ?? 80 + index * 40, y: seed.y ?? 60 + index * 30, accessMode: "owner" })),
    seeds: initialSeeds,
    relationships: initialRelationships,
    relationshipReferences: initialReferences,
    domains: initialDomains,
    domainCategories: initialDomainCategories,
    namingPolicy: {
      tablePluralization: "singular",
      tableJoinMode: "separator", tableSeparator: "_",
      fieldJoinMode: "separator", fieldSeparator: "_",
      domainJoinMode: "concatenate", domainSeparator: "_"
    },
    vocabularyEntries: [],
    dfd: defaultDfdState(),
    users: [],
    locks: {}
  });
  const [connected, setConnected] = useState(false);
  const joinedRef = useRef(false);
  const cursorFrameRef = useRef<number | undefined>(undefined);
  const pendingCursorRef = useRef<{ x: number; y: number } | undefined>(undefined);
  const pendingSeedsRef = useRef(new Map<string, T>());
  const outboundSeedsRef = useRef(new Map<string, { seed: T; canvasId: string }>());
  const savingSeedsRef = useRef(new Set<string>());
  const pendingPlacementsRef = useRef(new Map<string, CanvasModelPlacement>());
  const outboundPlacementsRef = useRef(new Map<string, CanvasModelPlacement>());
  const savingPlacementsRef = useRef(new Set<string>());
  const pendingDfdRef = useRef<DfdState | null>(null);
  const outboundDfdRef = useRef<DfdState | null>(null);
  const savingDfdRef = useRef(false);

  const applyServerState = useCallback((incoming: CollaborationState<T>) => {
    startTransition(() => {
      setState(() => {
        const serverIDs = new Set(incoming.seeds.map((seed) => seed.id));
        const seeds = incoming.seeds.map((serverSeed) => {
          const pending = pendingSeedsRef.current.get(serverSeed.id);
          if (!pending) return serverSeed;
          if (JSON.stringify(pending) === JSON.stringify(serverSeed)) {
            pendingSeedsRef.current.delete(serverSeed.id);
            return serverSeed;
          }
          return pending;
        });
        for (const pending of pendingSeedsRef.current.values()) {
          if (!serverIDs.has(pending.id)) seeds.push(pending);
        }
        const incomingCanvases = incoming.canvases?.length ? incoming.canvases : [{ id: "main", name: "Main canvas" }];
        const serverPlacements = incoming.placements ?? incoming.seeds.map((seed, index) => ({ canvasId: "main", seedId: seed.id, x: seed.x ?? 80 + index * 40, y: seed.y ?? 60 + index * 30, accessMode: "owner" as const }));
        const placements = serverPlacements.map((serverPlacement) => {
          const key = `${serverPlacement.canvasId}:${serverPlacement.seedId}`;
          const pending = pendingPlacementsRef.current.get(key);
          if (!pending) return serverPlacement;
          if (JSON.stringify(pending) === JSON.stringify(serverPlacement)) {
            pendingPlacementsRef.current.delete(key);
            return serverPlacement;
          }
          return pending;
        });
        const serverPlacementKeys = new Set(serverPlacements.map((placement) => `${placement.canvasId}:${placement.seedId}`));
        for (const [key, pending] of pendingPlacementsRef.current) {
          if (!serverPlacementKeys.has(key)) placements.push(pending);
        }
        const rawDfd = incoming.dfd?.canvases?.length ? incoming.dfd : defaultDfdState();
        const serverDfd = normalizeDfdState({ canvases: rawDfd.canvases, nodes: rawDfd.nodes ?? [], flows: rawDfd.flows ?? [], groups: rawDfd.groups ?? [] });
        let dfd = serverDfd;
        if (pendingDfdRef.current) {
          if (JSON.stringify(pendingDfdRef.current) === JSON.stringify(serverDfd)) pendingDfdRef.current = null;
          else dfd = pendingDfdRef.current;
        }
        return {
          ...incoming,
          canvases: incomingCanvases,
          placements,
          namingPolicy: incoming.namingPolicy ?? {
            tablePluralization: "singular",
            tableJoinMode: "separator", tableSeparator: "_",
            fieldJoinMode: "separator", fieldSeparator: "_",
            domainJoinMode: "concatenate", domainSeparator: "_"
          },
          vocabularyEntries: incoming.vocabularyEntries ?? [],
          dfd,
          seeds
        };
      });
    });
  }, []);

  const getSessionUser = useEffectEvent(() => me);
  const handleIncomingState = useEffectEvent((incoming: CollaborationState<T>) => {
    applyServerState(incoming);
  });
  const handleServerMessage = useEffectEvent((event: MessageEvent<string>) => {
    handleIncomingState(JSON.parse(event.data) as CollaborationState<T>);
  });
  const handleConnectionOpen = useEffectEvent(() => {
    setConnected(true);
  });
  const handleConnectionError = useEffectEvent(() => {
    setConnected(false);
  });

  useEffect(() => {
    let events: EventSource | undefined;
    let cancelled = false;
    const sessionUser = getSessionUser();
    void post("/api/collaboration/join", {
      user: sessionUser,
      seeds: initialSeeds,
      relationships: initialRelationships,
      relationshipReferences: initialReferences,
      domains: initialDomains,
      assignAvailableName: identity.assignAvailableName
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not join collaboration session");
        const joinedState = (await response.json()) as CollaborationState<T>;
        if (cancelled) return;
        const assignedUser = joinedState.users.find((user) => user.id === sessionUser.id);
        if (assignedUser) {
          setMe(assignedUser);
          if (identity.assignAvailableName) localStorage.setItem("erdsketch-user-name", assignedUser.name);
        }
        joinedRef.current = true;
        handleIncomingState(joinedState);
        events = new EventSource(`/api/collaboration/events?clientId=${encodeURIComponent(sessionUser.id)}`);
        events.onopen = handleConnectionOpen;
        events.onmessage = handleServerMessage;
        events.onerror = handleConnectionError;
      })
      .catch(handleConnectionError);
    return () => {
      cancelled = true;
      events?.close();
      if (cursorFrameRef.current !== undefined) cancelAnimationFrame(cursorFrameRef.current);
    };
  }, [identity.assignAvailableName, initialDomainCategories, initialDomains, initialReferences, initialRelationships, initialSeeds, me.id]);

  const rename = useCallback(
    async (name: string) => {
      const normalized = name.trim();
      if (!normalized) return false;
      localStorage.setItem("erdsketch-user-name", normalized);
      setMe((current) => ({ ...current, name: normalized }));
      const response = await post("/api/collaboration/user", { clientId: me.id, name: normalized });
      return response.ok;
    },
    [me.id]
  );

  const moveCursor = useCallback(
    (x: number, y: number) => {
      if (!joinedRef.current) return;
      pendingCursorRef.current = { x, y };
      if (cursorFrameRef.current !== undefined) return;
      cursorFrameRef.current = requestAnimationFrame(() => {
        cursorFrameRef.current = undefined;
        if (pendingCursorRef.current) {
          void post("/api/collaboration/user", { clientId: me.id, ...pendingCursorRef.current });
        }
      });
    },
    [me.id]
  );

  const changeCanvas = useCallback(async (canvasId: string) => {
    setMe((current) => ({ ...current, canvasId }));
    const response = await post("/api/collaboration/user", { clientId: me.id, canvasId });
    return response.ok;
  }, [me.id]);

  const lock = useCallback(
    async (seedId: string) => {
      const response = await post("/api/collaboration/lock", { clientId: me.id, seedIds: [seedId], action: "lock" });
      if (response.ok) {
        startTransition(() => {
          setState((current) => {
            const locks = Object.fromEntries(Object.entries(current.locks).filter(([, owner]) => owner.id !== me.id));
            locks[seedId] = me;
            return { ...current, locks };
          });
        });
      }
      return response.ok;
    },
    [me]
  );

  const unlock = useCallback(
    async (seedId: string) => {
      const response = await post("/api/collaboration/lock", { clientId: me.id, seedIds: [seedId], action: "unlock" });
      if (response.ok) {
        startTransition(() => {
          setState((current) => {
            const locks = { ...current.locks };
            delete locks[seedId];
            return { ...current, locks };
          });
        });
      }
    },
    [me.id]
  );

  const lockAll = useCallback(
    async (seedIds: string[]) => {
      const uniqueIDs = [...new Set(seedIds)];
      const response = await post("/api/collaboration/lock", { clientId: me.id, seedIds: uniqueIDs, action: "lock" });
      if (!response.ok) return false;
      startTransition(() => {
        setState((current) => {
          const locks = { ...current.locks };
          for (const seedId of uniqueIDs) locks[seedId] = me;
          return { ...current, locks };
        });
      });
      return true;
    },
    [me]
  );

  const unlockAll = useCallback(
    async (seedIds: string[]) => {
      const uniqueIDs = [...new Set(seedIds)];
      const response = await post("/api/collaboration/lock", { clientId: me.id, seedIds: uniqueIDs, action: "unlock" });
      if (!response.ok) return;
      startTransition(() => {
        setState((current) => {
          const locks = { ...current.locks };
          for (const seedId of uniqueIDs) {
            if (locks[seedId]?.id === me.id) delete locks[seedId];
          }
          return { ...current, locks };
        });
      });
    },
    [me.id]
  );

  const saveSeed = useCallback(
    async (seed: T, create = false, canvasId = "main") => {
      pendingSeedsRef.current.set(seed.id, seed);
      if (create) {
        const response = await post("/api/collaboration/seed", { clientId: me.id, seed, create: true, canvasId });
        if (!response.ok) pendingSeedsRef.current.delete(seed.id);
        return response.ok;
      }

      outboundSeedsRef.current.set(seed.id, { seed, canvasId });
      if (savingSeedsRef.current.has(seed.id)) return true;
      savingSeedsRef.current.add(seed.id);
      let saved = true;
      try {
        while (outboundSeedsRef.current.has(seed.id)) {
          const next = outboundSeedsRef.current.get(seed.id)!;
          outboundSeedsRef.current.delete(seed.id);
          const response = await post("/api/collaboration/seed", { clientId: me.id, seed: next.seed, create: false, canvasId: next.canvasId });
          saved = response.ok;
          if (!saved) {
            pendingSeedsRef.current.delete(seed.id);
            outboundSeedsRef.current.delete(seed.id);
          }
        }
      } finally {
        savingSeedsRef.current.delete(seed.id);
      }
      return saved;
    },
    [me.id]
  );

  const setLocalSeeds = useCallback((seeds: T[]) => {
    setState((current) => ({ ...current, seeds }));
  }, []);

  const setLocalPlacements = useCallback((placements: CanvasModelPlacement[]) => {
    setState((current) => ({ ...current, placements }));
  }, []);

  const setLocalCanvases = useCallback((canvases: ErdCanvas[]) => {
    setState((current) => ({ ...current, canvases }));
  }, []);

  const savePlacement = useCallback(async (placement: CanvasModelPlacement, create = false) => {
    const key = `${placement.canvasId}:${placement.seedId}`;
    pendingPlacementsRef.current.set(key, placement);
    outboundPlacementsRef.current.set(key, placement);
    if (savingPlacementsRef.current.has(key)) return true;
    savingPlacementsRef.current.add(key);
    let saved = true;
    try {
      while (outboundPlacementsRef.current.has(key)) {
        const next = outboundPlacementsRef.current.get(key)!;
        outboundPlacementsRef.current.delete(key);
        const response = await post("/api/collaboration/placement", { clientId: me.id, placement: next, create });
        saved = response.ok;
        create = false;
        if (!saved) {
          pendingPlacementsRef.current.delete(key);
          outboundPlacementsRef.current.delete(key);
        }
      }
    } finally {
      savingPlacementsRef.current.delete(key);
    }
    return saved;
  }, [me.id]);

  const saveCanvas = useCallback(async (canvas: ErdCanvas, create = false) => {
    const response = await post("/api/collaboration/canvas", { clientId: me.id, canvas, create });
    return response.ok;
  }, [me.id]);

  const waitForJoin = useCallback(async () => {
    for (let attempt = 0; attempt < 40 && !joinedRef.current; attempt += 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
    }
    return joinedRef.current;
  }, []);

  const setLocalDfd = useCallback((dfd: DfdState) => {
    setState((current) => ({ ...current, dfd }));
  }, []);

  const saveDfd = useCallback(async (dfd: DfdState) => {
    pendingDfdRef.current = dfd;
    outboundDfdRef.current = dfd;
    if (savingDfdRef.current) return true;
    savingDfdRef.current = true;
    let saved = true;
    try {
      if (!(await waitForJoin())) return false;
      while (outboundDfdRef.current) {
        const next = outboundDfdRef.current;
        outboundDfdRef.current = null;
        const response = await post("/api/collaboration/dfd", { clientId: me.id, dfd: next });
        saved = response.ok;
        if (!saved) {
          pendingDfdRef.current = null;
          outboundDfdRef.current = null;
        }
      }
    } finally {
      savingDfdRef.current = false;
    }
    return saved;
  }, [me.id, waitForJoin]);

  const saveCatalogSeed = useCallback(async (seed: T, create = false) => {
    if (!(await waitForJoin())) return false;
    const response = await post("/api/collaboration/catalog-seed", { clientId: me.id, seed, create });
    return response.ok;
  }, [me.id, waitForJoin]);

  const transferOwnership = useCallback(async (seedId: string, expectedOwnerId: string, targetCanvasId: string) => {
    const response = await post("/api/collaboration/ownership", { clientId: me.id, seedId, expectedOwnerId, targetCanvasId });
    return response.ok;
  }, [me.id]);

  const setLocalRelationships = useCallback((relationships: Relationship[], relationshipReferences: RelationshipReference[]) => {
    setState((current) => ({ ...current, relationships, relationshipReferences }));
  }, []);

  const setLocalDomains = useCallback((domains: DataDomain[]) => {
    setState((current) => ({ ...current, domains }));
  }, []);

  const setLocalDomainCategories = useCallback((domainCategories: DomainCategory[]) => {
    setState((current) => ({ ...current, domainCategories }));
  }, []);

  const saveDomain = useCallback(
    async (domain: DataDomain, options: { create?: boolean; delete?: boolean } = {}) => {
      const response = await post("/api/collaboration/domain", {
        clientId: me.id,
        domain,
        create: options.create ?? false,
        delete: options.delete ?? false
      });
      return response.ok;
    },
    [me.id]
  );

  const saveDomainCategory = useCallback(
    async (category: DomainCategory, create = false) => {
      const response = await post("/api/collaboration/domain-category", { clientId: me.id, category, create });
      return response.ok;
    },
    [me.id]
  );

  const saveNamingPolicy = useCallback(async (policy: NamingPolicy) => {
    const response = await post("/api/collaboration/naming-policy", { clientId: me.id, policy });
    if (response.ok) setState((current) => ({ ...current, namingPolicy: policy }));
    return response.ok;
  }, [me.id]);

  const saveVocabularyEntry = useCallback(async (entry: VocabularyEntry, options: { create?: boolean; delete?: boolean } = {}) => {
    const response = await post("/api/collaboration/vocabulary", {
      clientId: me.id,
      entry,
      create: options.create ?? false,
      delete: options.delete ?? false
    });
    return response.ok;
  }, [me.id]);

  const setLocalVocabularyEntries = useCallback((next: VocabularyEntry[] | ((current: VocabularyEntry[]) => VocabularyEntry[])) => {
    setState((current) => ({ ...current, vocabularyEntries: typeof next === "function" ? next(current.vocabularyEntries) : next }));
  }, []);

  const saveRelationship = useCallback(
    async (relationship: Relationship, reference: RelationshipReference, options: { create?: boolean; delete?: boolean } = {}) => {
      const response = await post("/api/collaboration/relationship", {
        clientId: me.id,
        relationship,
        reference,
        create: options.create ?? false,
        delete: options.delete ?? false
      });
      return response.ok;
    },
    [me.id]
  );

  const saveRefinement = useCallback(async (result: RefinementResult) => {
    const response = await post("/api/collaboration/refinement", { clientId: me.id, ...result });
    return response.ok;
  }, [me.id]);

  return {
    me,
    seeds: state.seeds,
    canvases: state.canvases,
    placements: state.placements,
    users: state.users,
    locks: state.locks,
    relationships: state.relationships,
    relationshipReferences: state.relationshipReferences,
    domains: state.domains,
    domainCategories: state.domainCategories,
    namingPolicy: state.namingPolicy,
    vocabularyEntries: state.vocabularyEntries,
    dfd: state.dfd,
    connected,
    rename,
    changeCanvas,
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
    transferOwnership,
    saveRelationship,
    saveRefinement,
    saveDomain,
    saveDomainCategory,
    saveNamingPolicy,
    saveVocabularyEntry,
    setLocalSeeds,
    setLocalCanvases,
    setLocalDfd,
    setLocalPlacements,
    setLocalRelationships,
    setLocalDomains,
    setLocalDomainCategories,
    setLocalVocabularyEntries
  };
}
