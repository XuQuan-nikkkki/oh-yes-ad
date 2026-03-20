import { create } from "zustand";

export type CurrentUser = {
  id: string;
  name: string;
  fullName?: string | null;
  phone?: string | null;
  roles?: Array<{
    role?: {
      code?: string | null;
    } | null;
  }> | null;
};

type AuthStore = {
  currentUser: CurrentUser | null;
  loading: boolean;
  loaded: boolean;
  fetchMe: (force?: boolean) => Promise<CurrentUser | null>;
  setCurrentUser: (user: CurrentUser | null) => void;
  clearCurrentUser: () => void;
};

export const getRoleCodesFromUser = (user: CurrentUser | null) =>
  (user?.roles ?? [])
    .map((item) => item?.role?.code)
    .filter((code): code is string => Boolean(code));

export const useAuthStore = create<AuthStore>((set, get) => ({
  currentUser: null,
  loading: false,
  loaded: false,
  fetchMe: async (force = false) => {
    if (get().loading) return get().currentUser;
    if (get().loaded && !force) return get().currentUser;

    set({ loading: true });
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) {
        set({ currentUser: null, loading: false, loaded: true });
        return null;
      }
      const data = (await res.json()) as CurrentUser;
      set({ currentUser: data, loading: false, loaded: true });
      return data;
    } catch {
      set({ currentUser: null, loading: false, loaded: true });
      return null;
    }
  },
  setCurrentUser: (user) => {
    set({ currentUser: user, loaded: true });
  },
  clearCurrentUser: () => {
    set({ currentUser: null, loaded: true, loading: false });
  },
}));

