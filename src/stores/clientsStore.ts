import { create } from "zustand";

export type ClientListItem = {
  id: string;
  name?: string | null;
  industryOptionId?: string | null;
  industryOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  [key: string]: unknown;
};

type ClientsStore = {
  clients: ClientListItem[];
  byId: Record<string, ClientListItem>;
  loading: boolean;
  loaded: boolean;
  fetchClients: (force?: boolean) => Promise<ClientListItem[]>;
  upsertClients: (rows: ClientListItem[]) => void;
  removeClient: (id: string) => void;
  clearClientsCache: () => void;
};

const mergeRows = (
  previous: Record<string, ClientListItem>,
  rows: ClientListItem[],
) => {
  const next = { ...previous };
  for (const row of rows) {
    if (!row?.id) continue;
    next[row.id] = {
      ...(next[row.id] ?? {}),
      ...row,
    };
  }
  return next;
};

const buildList = (byId: Record<string, ClientListItem>, ids: string[]) =>
  ids
    .map((id) => byId[id])
    .filter((item): item is ClientListItem => Boolean(item));

export const useClientsStore = create<ClientsStore>((set, get) => ({
  clients: [],
  byId: {},
  loading: false,
  loaded: false,
  fetchClients: async (force = false) => {
    if (get().loading) return get().clients;
    if (get().loaded && !force) return get().clients;

    set({ loading: true });

    try {
      const res = await fetch("/api/clients", { cache: "no-store" });
      const data = res.ok ? await res.json() : [];
      const rows = Array.isArray(data) ? (data as ClientListItem[]) : [];
      const ids = rows
        .map((row) => row?.id)
        .filter((id): id is string => Boolean(id));

      set((state) => {
        const byId = mergeRows(state.byId, rows);
        return {
          byId,
          clients: buildList(byId, ids),
          loading: false,
          loaded: true,
        };
      });

      return get().clients;
    } catch {
      set({ loading: false });
      return get().clients;
    }
  },
  upsertClients: (rows) => {
    set((state) => {
      const byId = mergeRows(state.byId, rows);
      const seen = new Set(state.clients.map((item) => item.id));
      const mergedClients = [...state.clients];
      for (const row of rows) {
        if (!row?.id || seen.has(row.id)) continue;
        mergedClients.unshift(byId[row.id]);
        seen.add(row.id);
      }
      return {
        byId,
        clients: mergedClients.map((item) => byId[item.id]).filter(Boolean),
      };
    });
  },
  removeClient: (id) => {
    if (!id) return;
    set((state) => {
      const nextById = { ...state.byId };
      delete nextById[id];
      return {
        byId: nextById,
        clients: state.clients.filter((item) => item.id !== id),
      };
    });
  },
  clearClientsCache: () => {
    set({
      clients: [],
      byId: {},
      loading: false,
      loaded: false,
    });
  },
}));
