import { create } from "zustand";

export type ProjectListItem = {
  id: string;
  name?: string | null;
  [key: string]: unknown;
};

type ProjectQuery = {
  type?: string;
  ownerId?: string;
  clientId?: string;
  vendorId?: string;
};

type QueryState = {
  ids: string[];
  loading: boolean;
  loaded: boolean;
};

type ProjectsStore = {
  byId: Record<string, ProjectListItem>;
  queryState: Record<string, QueryState>;
  fetchProjects: (query?: ProjectQuery & { force?: boolean }) => Promise<ProjectListItem[]>;
  upsertProjects: (rows: ProjectListItem[]) => void;
  removeProject: (id: string) => void;
  clearProjectsCache: () => void;
};

const buildQueryKey = (query?: ProjectQuery) => {
  const q = query ?? {};
  const normalized = {
    type: q.type ?? "",
    ownerId: q.ownerId ?? "",
    clientId: q.clientId ?? "",
    vendorId: q.vendorId ?? "",
  };
  return JSON.stringify(normalized);
};

const buildSearchParams = (query?: ProjectQuery) => {
  const params = new URLSearchParams();
  if (query?.type) params.set("type", query.type);
  if (query?.ownerId) params.set("ownerId", query.ownerId);
  if (query?.clientId) params.set("clientId", query.clientId);
  if (query?.vendorId) params.set("vendorId", query.vendorId);
  return params.toString();
};

const mergeRows = (
  previous: Record<string, ProjectListItem>,
  rows: ProjectListItem[],
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

export const useProjectsStore = create<ProjectsStore>((set, get) => ({
  byId: {},
  queryState: {},
  fetchProjects: async (query) => {
    const force = Boolean(query?.force);
    const cleanQuery: ProjectQuery = {
      type: query?.type,
      ownerId: query?.ownerId,
      clientId: query?.clientId,
      vendorId: query?.vendorId,
    };
    const key = buildQueryKey(cleanQuery);
    const existingQueryState = get().queryState[key];

    if (existingQueryState?.loading) {
      return existingQueryState.ids
        .map((id) => get().byId[id])
        .filter((item): item is ProjectListItem => Boolean(item));
    }
    if (existingQueryState?.loaded && !force) {
      return existingQueryState.ids
        .map((id) => get().byId[id])
        .filter((item): item is ProjectListItem => Boolean(item));
    }

    set((state) => ({
      queryState: {
        ...state.queryState,
        [key]: {
          ids: existingQueryState?.ids ?? [],
          loading: true,
          loaded: existingQueryState?.loaded ?? false,
        },
      },
    }));

    try {
      const queryString = buildSearchParams(cleanQuery);
      const url = queryString ? `/api/projects?${queryString}` : "/api/projects";
      const res = await fetch(url, { cache: "no-store" });
      const data = res.ok ? await res.json() : [];
      const rows = Array.isArray(data) ? (data as ProjectListItem[]) : [];
      const ids = rows
        .map((row) => row?.id)
        .filter((id): id is string => Boolean(id));

      set((state) => ({
        byId: mergeRows(state.byId, rows),
        queryState: {
          ...state.queryState,
          [key]: {
            ids,
            loading: false,
            loaded: true,
          },
        },
      }));

      return ids
        .map((id) => get().byId[id])
        .filter((item): item is ProjectListItem => Boolean(item));
    } catch {
      set((state) => ({
        queryState: {
          ...state.queryState,
          [key]: {
            ids: existingQueryState?.ids ?? [],
            loading: false,
            loaded: existingQueryState?.loaded ?? false,
          },
        },
      }));
      return existingQueryState?.ids
        ?.map((id) => get().byId[id])
        .filter((item): item is ProjectListItem => Boolean(item)) ?? [];
    }
  },
  upsertProjects: (rows) => {
    set((state) => ({
      byId: mergeRows(state.byId, rows),
    }));
  },
  removeProject: (id) => {
    set((state) => {
      if (!id) return state;
      const nextById = { ...state.byId };
      delete nextById[id];
      const nextQueryState = Object.fromEntries(
        Object.entries(state.queryState).map(([key, query]) => [
          key,
          {
            ...query,
            ids: query.ids.filter((queryId) => queryId !== id),
          },
        ]),
      );
      return {
        byId: nextById,
        queryState: nextQueryState,
      };
    });
  },
  clearProjectsCache: () => {
    set({
      byId: {},
      queryState: {},
    });
  },
}));
