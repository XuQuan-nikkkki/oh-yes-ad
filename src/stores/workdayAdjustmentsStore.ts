import { create } from "zustand";

export type WorkdayAdjustmentItem = {
  id: string;
  name?: string | null;
  changeType: string;
  startDate: string;
  endDate: string;
};

type WorkdayAdjustmentsStore = {
  adjustments: WorkdayAdjustmentItem[];
  loading: boolean;
  loaded: boolean;
  fetchAdjustments: (options?: { force?: boolean }) => Promise<WorkdayAdjustmentItem[]>;
  clearAdjustmentsCache: () => void;
};

export const useWorkdayAdjustmentsStore = create<WorkdayAdjustmentsStore>(
  (set, get) => ({
    adjustments: [],
    loading: false,
    loaded: false,
    fetchAdjustments: async (options) => {
      const force = Boolean(options?.force);
      if (get().loading) return get().adjustments;
      if (get().loaded && !force) return get().adjustments;

      set({ loading: true });
      try {
        const res = await fetch("/api/workday-adjustments", {
          cache: "no-store",
        });
        const data = res.ok ? await res.json() : [];
        const rows = Array.isArray(data) ? data : [];
        set({
          adjustments: rows,
          loading: false,
          loaded: true,
        });
        return rows;
      } catch {
        set({ loading: false });
        return [];
      }
    },
    clearAdjustmentsCache: () => {
      set({
        adjustments: [],
        loading: false,
        loaded: false,
      });
    },
  }),
);
