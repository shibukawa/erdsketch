import { useCallback, useEffect, useRef, useState } from "react";

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
  users: Collaborator[];
  locks: Record<string, Collaborator>;
};

const animals = ["Lion", "Koara", "Panda", "Fox", "Otter", "Tiger", "Rabbit", "Falcon", "Dolphin", "Bear"];
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
  let name = localStorage.getItem("erdsketch-user-name");
  if (!name) {
    name = randomItem(animals);
    localStorage.setItem("erdsketch-user-name", name);
  }
  return { id: clientId, name, color: randomItem(colors), x: 0, y: 0, online: true };
}

async function post(path: string, body: unknown) {
  return fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function useCollaboration<T extends { id: string }>(initialSeeds: T[]) {
  const [me, setMe] = useState<Collaborator>(() => getIdentity());
  const [state, setState] = useState<CollaborationState<T>>({ seeds: initialSeeds, users: [], locks: {} });
  const [connected, setConnected] = useState(false);
  const joinedRef = useRef(false);
  const cursorFrameRef = useRef<number | undefined>(undefined);
  const pendingCursorRef = useRef<{ x: number; y: number } | undefined>(undefined);
  const pendingSeedsRef = useRef(new Map<string, T>());
  const outboundSeedsRef = useRef(new Map<string, T>());
  const savingSeedsRef = useRef(new Set<string>());

  const applyServerState = useCallback((incoming: CollaborationState<T>) => {
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
      return { ...incoming, seeds };
    });
  }, []);

  useEffect(() => {
    let events: EventSource | undefined;
    let cancelled = false;
    void post("/api/collaboration/join", { user: me, seeds: initialSeeds })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not join collaboration session");
        const joinedState = (await response.json()) as CollaborationState<T>;
        if (cancelled) return;
        joinedRef.current = true;
        applyServerState(joinedState);
        events = new EventSource(`/api/collaboration/events?clientId=${encodeURIComponent(me.id)}`);
        events.onopen = () => setConnected(true);
        events.onmessage = (event) => applyServerState(JSON.parse(event.data) as CollaborationState<T>);
        events.onerror = () => setConnected(false);
      })
      .catch(() => setConnected(false));
    return () => {
      cancelled = true;
      events?.close();
      if (cursorFrameRef.current !== undefined) cancelAnimationFrame(cursorFrameRef.current);
    };
    // The identity and initial document are intentionally fixed for this tab session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyServerState]);

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
      const response = await post("/api/collaboration/lock", { clientId: me.id, seedId, action: "lock" });
      if (response.ok) {
        setState((current) => {
          const locks = Object.fromEntries(Object.entries(current.locks).filter(([, owner]) => owner.id !== me.id));
          locks[seedId] = me;
          return { ...current, locks };
        });
      }
      return response.ok;
    },
    [me]
  );

  const unlock = useCallback(
    async (seedId: string) => {
      const response = await post("/api/collaboration/lock", { clientId: me.id, seedId, action: "unlock" });
      if (response.ok) {
        setState((current) => {
          const locks = { ...current.locks };
          delete locks[seedId];
          return { ...current, locks };
        });
      }
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

  return {
    me,
    seeds: state.seeds,
    users: state.users,
    locks: state.locks,
    connected,
    rename,
    moveCursor,
    lock,
    unlock,
    saveSeed,
    setLocalSeeds: (seeds: T[]) => setState((current) => ({ ...current, seeds }))
  };
}
