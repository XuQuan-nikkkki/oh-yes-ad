import { create } from "zustand";

export type ClientContractListItem = {
  id: string;
  projectId: string;
  legalEntityId: string;
  contractAmount?: number | string | null;
  legalEntity?: {
    id: string;
    name: string;
    fullName?: string | null;
  } | null;
  [key: string]: unknown;
};

type ClientContractsStore = {
  byProjectId: Record<string, ClientContractListItem[]>;
  loadingByProjectId: Record<string, boolean>;
  loadedByProjectId: Record<string, boolean>;
  fetchByProjectId: (
    projectId: string,
    options?: { force?: boolean },
  ) => Promise<ClientContractListItem[]>;
  upsertByProjectId: (projectId: string, rows: ClientContractListItem[]) => void;
  clearClientContractsCache: () => void;
};

export const useClientContractsStore = create<ClientContractsStore>(
  (set, get) => ({
    byProjectId: {},
    loadingByProjectId: {},
    loadedByProjectId: {},
    fetchByProjectId: async (projectId, options) => {
      const normalizedProjectId = projectId.trim();
      if (!normalizedProjectId) return [];

      const force = Boolean(options?.force);
      const loading = get().loadingByProjectId[normalizedProjectId];
      const loaded = get().loadedByProjectId[normalizedProjectId];
      if (loading) return get().byProjectId[normalizedProjectId] ?? [];
      if (loaded && !force) return get().byProjectId[normalizedProjectId] ?? [];

      set((state) => ({
        loadingByProjectId: {
          ...state.loadingByProjectId,
          [normalizedProjectId]: true,
        },
      }));

      try {
        const query = new URLSearchParams({ projectId: normalizedProjectId });
        const res = await fetch(`/api/client-contracts?${query.toString()}`, {
          cache: "no-store",
        });
        const data = res.ok ? await res.json() : [];
        const rows = Array.isArray(data) ? (data as ClientContractListItem[]) : [];

        set((state) => ({
          byProjectId: {
            ...state.byProjectId,
            [normalizedProjectId]: rows,
          },
          loadingByProjectId: {
            ...state.loadingByProjectId,
            [normalizedProjectId]: false,
          },
          loadedByProjectId: {
            ...state.loadedByProjectId,
            [normalizedProjectId]: true,
          },
        }));

        return rows;
      } catch {
        set((state) => ({
          loadingByProjectId: {
            ...state.loadingByProjectId,
            [normalizedProjectId]: false,
          },
        }));
        return get().byProjectId[normalizedProjectId] ?? [];
      }
    },
    upsertByProjectId: (projectId, rows) => {
      const normalizedProjectId = projectId.trim();
      if (!normalizedProjectId) return;
      set((state) => ({
        byProjectId: {
          ...state.byProjectId,
          [normalizedProjectId]: rows,
        },
        loadedByProjectId: {
          ...state.loadedByProjectId,
          [normalizedProjectId]: true,
        },
      }));
    },
    clearClientContractsCache: () => {
      set({
        byProjectId: {},
        loadingByProjectId: {},
        loadedByProjectId: {},
      });
    },
  }),
);
