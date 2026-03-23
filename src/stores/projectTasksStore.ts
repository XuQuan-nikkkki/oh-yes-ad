import { create } from "zustand";

export type ProjectTaskStoreRow = {
  id: string;
  name?: string | null;
  status?: string | null;
  statusOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  dueDate?: string | null;
  segment?: {
    id: string;
    name: string;
    project?: {
      id: string;
      name: string;
      statusOption?: {
        id: string;
        value: string;
        color?: string | null;
      } | null;
      stageOption?: {
        id: string;
        value: string;
        color?: string | null;
      } | null;
      startDate?: string | null;
      endDate?: string | null;
    } | null;
  } | null;
  owner?: { id: string; name: string } | null;
};

type FetchTaskOptions = {
  ownerId?: string;
  force?: boolean;
};

type ProjectTasksStore = {
  tasksByKey: Record<string, ProjectTaskStoreRow[]>;
  loadingByKey: Record<string, boolean>;
  loadedByKey: Record<string, boolean>;
  fetchTasks: (options?: FetchTaskOptions) => Promise<ProjectTaskStoreRow[]>;
  upsertTasks: (rows: ProjectTaskStoreRow[]) => void;
  removeTask: (id: string) => void;
  clearTasksCache: (key?: string) => void;
};

const getCacheKey = (ownerId?: string) => `owner:${ownerId ?? "all"}`;

export const useProjectTasksStore = create<ProjectTasksStore>((set, get) => ({
  tasksByKey: {},
  loadingByKey: {},
  loadedByKey: {},
  fetchTasks: async (options) => {
    const ownerId = options?.ownerId;
    const force = Boolean(options?.force);
    const key = getCacheKey(ownerId);
    const state = get();
    if (state.loadingByKey[key]) return state.tasksByKey[key] ?? [];
    if (state.loadedByKey[key] && !force) return state.tasksByKey[key] ?? [];

    set((prev) => ({
      loadingByKey: { ...prev.loadingByKey, [key]: true },
    }));
    try {
      const query = new URLSearchParams();
      if (ownerId) query.set("ownerId", ownerId);
      const queryString = query.toString();
      const res = await fetch(
        `/api/project-tasks${queryString ? `?${queryString}` : ""}`,
        { cache: "no-store" },
      );
      const data = res.ok ? await res.json() : [];
      const rows = Array.isArray(data) ? (data as ProjectTaskStoreRow[]) : [];
      set((prev) => ({
        tasksByKey: { ...prev.tasksByKey, [key]: rows },
        loadingByKey: { ...prev.loadingByKey, [key]: false },
        loadedByKey: { ...prev.loadedByKey, [key]: true },
      }));
      return rows;
    } catch {
      set((prev) => ({
        loadingByKey: { ...prev.loadingByKey, [key]: false },
      }));
      return [];
    }
  },
  upsertTasks: (rows) => {
    set((state) => {
      const nextTasksByKey: Record<string, ProjectTaskStoreRow[]> = {
        ...state.tasksByKey,
      };
      for (const key of Object.keys(nextTasksByKey)) {
        const existingRows = nextTasksByKey[key] ?? [];
        const existingIds = new Set(existingRows.map((row) => row.id));
        const map = new Map(existingRows.map((row) => [row.id, row]));
        const prependedIds: string[] = [];
        for (const row of rows) {
          if (!row?.id) continue;
          if (!existingIds.has(row.id) && !prependedIds.includes(row.id)) {
            prependedIds.push(row.id);
          }
          map.set(row.id, {
            ...(map.get(row.id) ?? {}),
            ...row,
          });
        }
        nextTasksByKey[key] = [
          ...prependedIds
            .map((id) => map.get(id))
            .filter((item): item is ProjectTaskStoreRow => Boolean(item)),
          ...existingRows
            .map((row) => map.get(row.id))
            .filter((item): item is ProjectTaskStoreRow => Boolean(item)),
        ];
      }
      return {
        tasksByKey: nextTasksByKey,
      };
    });
  },
  removeTask: (id) => {
    if (!id) return;
    set((state) => {
      const nextTasksByKey: Record<string, ProjectTaskStoreRow[]> = {};
      for (const [key, rows] of Object.entries(state.tasksByKey)) {
        nextTasksByKey[key] = (rows ?? []).filter((item) => item.id !== id);
      }
      return {
        tasksByKey: nextTasksByKey,
      };
    });
  },
  clearTasksCache: (key) => {
    if (!key) {
      set({
        tasksByKey: {},
        loadingByKey: {},
        loadedByKey: {},
      });
      return;
    }
    set((prev) => {
      const nextTasksByKey = { ...prev.tasksByKey };
      const nextLoadingByKey = { ...prev.loadingByKey };
      const nextLoadedByKey = { ...prev.loadedByKey };
      delete nextTasksByKey[key];
      delete nextLoadingByKey[key];
      delete nextLoadedByKey[key];
      return {
        tasksByKey: nextTasksByKey,
        loadingByKey: nextLoadingByKey,
        loadedByKey: nextLoadedByKey,
      };
    });
  },
}));
