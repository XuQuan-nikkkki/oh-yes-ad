import { create } from "zustand";
import type { ProjectSegmentsProTableRow } from "@/components/ProjectSegmentsProTable";

type ProjectSegmentsStore = {
  rows: ProjectSegmentsProTableRow[];
  byId: Record<string, ProjectSegmentsProTableRow>;
  loading: boolean;
  loaded: boolean;
  fetchSegments: (force?: boolean) => Promise<ProjectSegmentsProTableRow[]>;
  upsertSegments: (rows: ProjectSegmentsProTableRow[]) => void;
  removeSegment: (id: string) => void;
  clearSegmentsCache: () => void;
};

const mergeRows = (
  previous: Record<string, ProjectSegmentsProTableRow>,
  rows: ProjectSegmentsProTableRow[],
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

const buildList = (
  byId: Record<string, ProjectSegmentsProTableRow>,
  ids: string[],
) => ids.map((id) => byId[id]).filter((item): item is ProjectSegmentsProTableRow => Boolean(item));

export const useProjectSegmentsStore = create<ProjectSegmentsStore>((set, get) => ({
  rows: [],
  byId: {},
  loading: false,
  loaded: false,
  fetchSegments: async (force = false) => {
    if (get().loading) return get().rows;
    if (get().loaded && !force) return get().rows;

    set({ loading: true });
    try {
      const res = await fetch("/api/project-segments", { cache: "no-store" });
      const data = res.ok ? await res.json() : [];
      const rows = Array.isArray(data) ? (data as ProjectSegmentsProTableRow[]) : [];
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
  upsertSegments: (rows) => {
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
  removeSegment: (id) => {
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
  clearSegmentsCache: () => {
    set({ rows: [], byId: {}, loading: false, loaded: false });
  },
}));
