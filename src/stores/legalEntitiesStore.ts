import { create } from "zustand";

export type LegalEntityListItem = {
  id: string;
  name: string;
  fullName?: string | null;
  [key: string]: unknown;
};

type LegalEntitiesStore = {
  legalEntities: LegalEntityListItem[];
  loading: boolean;
  loaded: boolean;
  fetchLegalEntities: (force?: boolean) => Promise<LegalEntityListItem[]>;
  clearLegalEntitiesCache: () => void;
};

export const useLegalEntitiesStore = create<LegalEntitiesStore>((set, get) => ({
  legalEntities: [],
  loading: false,
  loaded: false,
  fetchLegalEntities: async (force = false) => {
    if (get().loading) return get().legalEntities;
    if (get().loaded && !force) return get().legalEntities;

    set({ loading: true });
    try {
      const res = await fetch("/api/legal-entities", { cache: "no-store" });
      const data = res.ok ? await res.json() : [];
      const rows = Array.isArray(data) ? (data as LegalEntityListItem[]) : [];
      set({
        legalEntities: rows,
        loading: false,
        loaded: true,
      });
      return rows;
    } catch {
      set({ loading: false });
      return get().legalEntities;
    }
  },
  clearLegalEntitiesCache: () => {
    set({
      legalEntities: [],
      loading: false,
      loaded: false,
    });
  },
}));

