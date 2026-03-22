import { create } from "zustand";
import type { PlannedWorkEntryRow } from "@/components/PlannedWorkEntriesTable";

type PlannedWorkQuery = {
  current: number;
  pageSize: number;
  filters: {
    projectName?: string;
    segmentName?: string;
    taskName?: string;
    ownerName?: string;
    year?: string;
    weekNumber?: string;
  };
};

type PlannedWorkEntriesStore = {
  dataByKey: Record<string, PlannedWorkEntryRow[]>;
  totalByKey: Record<string, number>;
  loadingByKey: Record<string, boolean>;
  loadedByKey: Record<string, boolean>;
  fetchEntries: (query: PlannedWorkQuery, force?: boolean) => Promise<{ data: PlannedWorkEntryRow[]; total: number }>;
  clearEntriesCache: () => void;
};

const buildKey = (query: PlannedWorkQuery) => JSON.stringify(query);

export const usePlannedWorkEntriesStore = create<PlannedWorkEntriesStore>((set, get) => ({
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
      if (query.filters.projectName) params.set("projectName", query.filters.projectName);
      if (query.filters.segmentName) params.set("segmentName", query.filters.segmentName);
      if (query.filters.taskName) params.set("taskName", query.filters.taskName);
      if (query.filters.ownerName) params.set("ownerName", query.filters.ownerName);
      if (query.filters.year) params.set("year", query.filters.year);
      if (query.filters.weekNumber) params.set("weekNumber", query.filters.weekNumber);

      const res = await fetch(`/api/planned-work-entries?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = res.ok ? await res.json() : [];
      const data = Array.isArray(payload)
        ? (payload as PlannedWorkEntryRow[])
        : Array.isArray(payload?.data)
          ? (payload.data as PlannedWorkEntryRow[])
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
