import { create } from "zustand";
import type { ActualWorkEntryRow } from "@/components/ActualWorkEntriesTable";

type ActualWorkQuery = {
  current: number;
  pageSize: number;
  filters: {
    title?: string;
    employeeName?: string;
    projectName?: string;
    startDate?: string;
    startDateFrom?: string;
    startDateTo?: string;
  };
};

type ActualWorkEntriesStore = {
  dataByKey: Record<string, ActualWorkEntryRow[]>;
  totalByKey: Record<string, number>;
  loadingByKey: Record<string, boolean>;
  loadedByKey: Record<string, boolean>;
  fetchEntries: (query: ActualWorkQuery, force?: boolean) => Promise<{ data: ActualWorkEntryRow[]; total: number }>;
  clearEntriesCache: () => void;
};

const buildKey = (query: ActualWorkQuery) => JSON.stringify(query);

export const useActualWorkEntriesStore = create<ActualWorkEntriesStore>((set, get) => ({
  dataByKey: {},
  totalByKey: {},
  loadingByKey: {},
  loadedByKey: {},
  fetchEntries: async (query, force = false) => {
    const key = buildKey(query);
    if (get().loadingByKey[key]) {
      return {
        data: get().dataByKey[key] ?? [],
        total: get().totalByKey[key] ?? 0,
      };
    }
    if (get().loadedByKey[key] && !force) {
      return {
        data: get().dataByKey[key] ?? [],
        total: get().totalByKey[key] ?? 0,
      };
    }

    set((state) => ({
      loadingByKey: { ...state.loadingByKey, [key]: true },
    }));

    try {
      const params = new URLSearchParams({
        page: String(query.current),
        pageSize: String(query.pageSize),
      });
      if (query.filters.title) params.set("title", query.filters.title);
      if (query.filters.employeeName) params.set("employeeName", query.filters.employeeName);
      if (query.filters.projectName) params.set("projectName", query.filters.projectName);
      if (query.filters.startDate) params.set("startDate", query.filters.startDate);
      if (query.filters.startDateFrom) params.set("startDateFrom", query.filters.startDateFrom);
      if (query.filters.startDateTo) params.set("startDateTo", query.filters.startDateTo);

      const res = await fetch(`/api/actual-work-entries?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = res.ok ? await res.json() : [];
      const data = Array.isArray(payload)
        ? (payload as ActualWorkEntryRow[])
        : Array.isArray(payload?.data)
          ? (payload.data as ActualWorkEntryRow[])
          : [];
      const total = Array.isArray(payload)
        ? payload.length
        : typeof payload?.total === "number"
          ? payload.total
          : data.length;

      set((state) => ({
        dataByKey: { ...state.dataByKey, [key]: data },
        totalByKey: { ...state.totalByKey, [key]: total },
        loadingByKey: { ...state.loadingByKey, [key]: false },
        loadedByKey: { ...state.loadedByKey, [key]: true },
      }));

      return { data, total };
    } catch {
      set((state) => ({
        loadingByKey: { ...state.loadingByKey, [key]: false },
      }));
      return {
        data: get().dataByKey[key] ?? [],
        total: get().totalByKey[key] ?? 0,
      };
    }
  },
  clearEntriesCache: () => {
    set({ dataByKey: {}, totalByKey: {}, loadingByKey: {}, loadedByKey: {} });
  },
}));
