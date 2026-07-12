import { startTransition, useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import type { DataDomain, DomainCategory, NamingPolicy, RefinementResult, Relationship, RelationshipReference, VocabularyEntry } from "./features/modeling/types";

export type Collaborator = {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  online: boolean;
};

type CollaborationState<T> = {
  seeds: T[];
  relationships: Relationship[];
  relationshipReferences: RelationshipReference[];
  domains: DataDomain[];
  domainCategories: DomainCategory[];
  namingPolicy: NamingPolicy;
  vocabularyEntries: VocabularyEntry[];
  users: Collaborator[];
  locks: Record<string, Collaborator>;
};

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
  return { user: { id: clientId, name, color: randomItem(colors), x: 0, y: 0, online: true }, assignAvailableName: !name };
}

async function post(path: string, body: unknown) {
  return fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function useCollaboration<T extends { id: string }>(initialSeeds: T[], initialRelationships: Relationship[] = [], initialReferences: RelationshipReference[] = [], initialDomains: DataDomain[] = [], initialDomainCategories: DomainCategory[] = []) {
  const [identity] = useState(getIdentity);
  const [me, setMe] = useState<Collaborator>(identity.user);
  const [state, setState] = useState<CollaborationState<T>>({
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
    users: [],
    locks: {}
  });
  const [connected, setConnected] = useState(false);
  const joinedRef = useRef(false);
  const cursorFrameRef = useRef<number | undefined>(undefined);
  const pendingCursorRef = useRef<{ x: number; y: number } | undefined>(undefined);
  const pendingSeedsRef = useRef(new Map<string, T>());
  const outboundSeedsRef = useRef(new Map<string, T>());
  const savingSeedsRef = useRef(new Set<string>());

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
        return {
          ...incoming,
          namingPolicy: incoming.namingPolicy ?? {
            tablePluralization: "singular",
            tableJoinMode: "separator", tableSeparator: "_",
            fieldJoinMode: "separator", fieldSeparator: "_",
            domainJoinMode: "concatenate", domainSeparator: "_"
          },
          vocabularyEntries: incoming.vocabularyEntries ?? [],
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
    async (seed: T, create = false) => {
      pendingSeedsRef.current.set(seed.id, seed);
      if (create) {
        const response = await post("/api/collaboration/seed", { clientId: me.id, seed, create: true });
        if (!response.ok) pendingSeedsRef.current.delete(seed.id);
        return response.ok;
      }

      outboundSeedsRef.current.set(seed.id, seed);
      if (savingSeedsRef.current.has(seed.id)) return true;
      savingSeedsRef.current.add(seed.id);
      let saved = true;
      try {
        while (outboundSeedsRef.current.has(seed.id)) {
          const next = outboundSeedsRef.current.get(seed.id)!;
          outboundSeedsRef.current.delete(seed.id);
          const response = await post("/api/collaboration/seed", { clientId: me.id, seed: next, create: false });
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
    users: state.users,
    locks: state.locks,
    relationships: state.relationships,
    relationshipReferences: state.relationshipReferences,
    domains: state.domains,
    domainCategories: state.domainCategories,
    namingPolicy: state.namingPolicy,
    vocabularyEntries: state.vocabularyEntries,
    connected,
    rename,
    moveCursor,
    lock,
    unlock,
    lockAll,
    unlockAll,
    saveSeed,
    saveRelationship,
    saveRefinement,
    saveDomain,
    saveDomainCategory,
    saveNamingPolicy,
    saveVocabularyEntry,
    setLocalSeeds,
    setLocalRelationships,
    setLocalDomains,
    setLocalDomainCategories,
    setLocalVocabularyEntries
  };
}
