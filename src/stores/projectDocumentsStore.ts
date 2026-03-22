import { create } from "zustand";
import type { ProjectDocumentRow } from "@/components/ProjectDocumentsTable";

type ProjectDocumentsStore = {
  rows: ProjectDocumentRow[];
  byId: Record<string, ProjectDocumentRow>;
  loading: boolean;
  loaded: boolean;
  fetchDocuments: (force?: boolean) => Promise<ProjectDocumentRow[]>;
  upsertDocuments: (rows: ProjectDocumentRow[]) => void;
  removeDocument: (id: string) => void;
  clearDocumentsCache: () => void;
};

const mergeRows = (
  previous: Record<string, ProjectDocumentRow>,
  rows: ProjectDocumentRow[],
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

const buildList = (byId: Record<string, ProjectDocumentRow>, ids: string[]) =>
  ids.map((id) => byId[id]).filter((item): item is ProjectDocumentRow => Boolean(item));

export const useProjectDocumentsStore = create<ProjectDocumentsStore>((set, get) => ({
  rows: [],
  byId: {},
  loading: false,
  loaded: false,
  fetchDocuments: async (force = false) => {
    if (get().loading) return get().rows;
    if (get().loaded && !force) return get().rows;

    set({ loading: true });
    try {
      const res = await fetch("/api/project-documents", { cache: "no-store" });
      const data = res.ok ? await res.json() : [];
      const rows = Array.isArray(data) ? (data as ProjectDocumentRow[]) : [];
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
  upsertDocuments: (rows) => {
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
  removeDocument: (id) => {
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
  clearDocumentsCache: () => {
    set({ rows: [], byId: {}, loading: false, loaded: false });
  },
}));
