import { create } from "zustand";
import type { ProjectMilestoneRow } from "@/components/ProjectMilestonesTable";

type ProjectMilestonesStore = {
  rows: ProjectMilestoneRow[];
  byId: Record<string, ProjectMilestoneRow>;
  loading: boolean;
  loaded: boolean;
  fetchMilestones: (force?: boolean) => Promise<ProjectMilestoneRow[]>;
  upsertMilestones: (rows: ProjectMilestoneRow[]) => void;
  removeMilestone: (id: string) => void;
  clearMilestonesCache: () => void;
};

const mergeRows = (
  previous: Record<string, ProjectMilestoneRow>,
  rows: ProjectMilestoneRow[],
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

const buildList = (byId: Record<string, ProjectMilestoneRow>, ids: string[]) =>
  ids.map((id) => byId[id]).filter((item): item is ProjectMilestoneRow => Boolean(item));

export const useProjectMilestonesStore = create<ProjectMilestonesStore>((set, get) => ({
  rows: [],
  byId: {},
  loading: false,
  loaded: false,
  fetchMilestones: async (force = false) => {
    if (get().loading) return get().rows;
    if (get().loaded && !force) return get().rows;

    set({ loading: true });
    try {
      const res = await fetch("/api/project-milestones", { cache: "no-store" });
      const data = res.ok ? await res.json() : [];
      const rows = Array.isArray(data) ? (data as ProjectMilestoneRow[]) : [];
      const ids = rows.map((row) => row?.id).filter((id): id is string => Boolean(id));

      set((state) => {
        const byId = mergeRows(state.byId, rows);
        return {
          byId,
          rows: buildList(byId, ids),
          loading: false,
          loaded: true,
        };
      });

      return get().rows;
    } catch {
      set({ loading: false });
      return get().rows;
    }
  },
  upsertMilestones: (rows) => {
    set((state) => {
      const byId = mergeRows(state.byId, rows);
      const seen = new Set(state.rows.map((item) => item.id));
      const merged = [...state.rows];
      for (const row of rows) {
        if (!row?.id || seen.has(row.id)) continue;
        merged.unshift(byId[row.id]);
        seen.add(row.id);
      }
      return {
        byId,
        rows: merged.map((item) => byId[item.id]).filter(Boolean),
      };
    });
  },
  removeMilestone: (id) => {
    if (!id) return;
    set((state) => {
      const nextById = { ...state.byId };
      delete nextById[id];
      return {
        byId: nextById,
        rows: state.rows.filter((item) => item.id !== id),
      };
    });
  },
  clearMilestonesCache: () => {
    set({ rows: [], byId: {}, loading: false, loaded: false });
  },
}));
