import { create } from "zustand";
import type { ClientContact } from "@/types/clientContact";

type ClientContactsStore = {
  contacts: ClientContact[];
  byId: Record<string, ClientContact>;
  loading: boolean;
  loaded: boolean;
  fetchContacts: (force?: boolean) => Promise<ClientContact[]>;
  upsertContacts: (rows: ClientContact[]) => void;
  removeContact: (id: string) => void;
  clearContactsCache: () => void;
};

const mergeRows = (
  previous: Record<string, ClientContact>,
  rows: ClientContact[],
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

const buildList = (byId: Record<string, ClientContact>, ids: string[]) =>
  ids.map((id) => byId[id]).filter((item): item is ClientContact => Boolean(item));

export const useClientContactsStore = create<ClientContactsStore>((set, get) => ({
  contacts: [],
  byId: {},
  loading: false,
  loaded: false,
  fetchContacts: async (force = false) => {
    if (get().loading) return get().contacts;
    if (get().loaded && !force) return get().contacts;

    set({ loading: true });
    try {
      const res = await fetch("/api/client-contacts", { cache: "no-store" });
      const data = res.ok ? await res.json() : [];
      const rows = Array.isArray(data) ? (data as ClientContact[]) : [];
      const ids = rows
        .map((row) => row?.id)
        .filter((id): id is string => Boolean(id));

      set((state) => {
        const byId = mergeRows(state.byId, rows);
        return {
          byId,
          contacts: buildList(byId, ids),
          loading: false,
          loaded: true,
        };
      });
      return get().contacts;
    } catch {
      set({ loading: false });
      return get().contacts;
    }
  },
  upsertContacts: (rows) => {
    set((state) => {
      const byId = mergeRows(state.byId, rows);
      const seen = new Set(state.contacts.map((item) => item.id));
      const merged = [...state.contacts];
      for (const row of rows) {
        if (!row?.id || seen.has(row.id)) continue;
        merged.unshift(byId[row.id]);
        seen.add(row.id);
      }
      return {
        byId,
        contacts: merged.map((item) => byId[item.id]).filter(Boolean),
      };
    });
  },
  removeContact: (id) => {
    if (!id) return;
    set((state) => {
      const nextById = { ...state.byId };
      delete nextById[id];
      return {
        byId: nextById,
        contacts: state.contacts.filter((item) => item.id !== id),
      };
    });
  },
  clearContactsCache: () => {
    set({
      contacts: [],
      byId: {},
      loading: false,
      loaded: false,
    });
  },
}));
