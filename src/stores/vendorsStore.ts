import { create } from "zustand";
import type { Vendor } from "@/types/vendor";

type VendorsStore = {
  vendors: Vendor[];
  byId: Record<string, Vendor>;
  loading: boolean;
  loaded: boolean;
  fetchVendors: (force?: boolean) => Promise<Vendor[]>;
  upsertVendors: (rows: Vendor[]) => void;
  removeVendor: (id: string) => void;
  clearVendorsCache: () => void;
};

const mergeRows = (previous: Record<string, Vendor>, rows: Vendor[]) => {
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

const buildList = (byId: Record<string, Vendor>, ids: string[]) =>
  ids.map((id) => byId[id]).filter((item): item is Vendor => Boolean(item));

export const useVendorsStore = create<VendorsStore>((set, get) => ({
  vendors: [],
  byId: {},
  loading: false,
  loaded: false,
  fetchVendors: async (force = false) => {
    if (get().loading) return get().vendors;
    if (get().loaded && !force) return get().vendors;

    set({ loading: true });
    try {
      const res = await fetch("/api/vendors", { cache: "no-store" });
      const data = res.ok ? await res.json() : [];
      const rows = Array.isArray(data) ? (data as Vendor[]) : [];
      const ids = rows
        .map((row) => row?.id)
        .filter((id): id is string => Boolean(id));

      set((state) => {
        const byId = mergeRows(state.byId, rows);
        return {
          byId,
          vendors: buildList(byId, ids),
          loading: false,
          loaded: true,
        };
      });
      return get().vendors;
    } catch {
      set({ loading: false });
      return get().vendors;
    }
  },
  upsertVendors: (rows) => {
    set((state) => {
      const byId = mergeRows(state.byId, rows);
      const seen = new Set(state.vendors.map((item) => item.id));
      const merged = [...state.vendors];
      for (const row of rows) {
        if (!row?.id || seen.has(row.id)) continue;
        merged.unshift(byId[row.id]);
        seen.add(row.id);
      }
      return {
        byId,
        vendors: merged.map((item) => byId[item.id]).filter(Boolean),
      };
    });
  },
  removeVendor: (id) => {
    if (!id) return;
    set((state) => {
      const nextById = { ...state.byId };
      delete nextById[id];
      return {
        byId: nextById,
        vendors: state.vendors.filter((item) => item.id !== id),
      };
    });
  },
  clearVendorsCache: () => {
    set({
      vendors: [],
      byId: {},
      loading: false,
      loaded: false,
    });
  },
}));
