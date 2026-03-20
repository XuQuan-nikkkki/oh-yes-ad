import { create } from "zustand";

export type EmployeeListItem = {
  id: string;
  name: string;
  fullName?: string | null;
  phone?: string | null;
  employmentStatus?: string | null;
  [key: string]: unknown;
};

type EmployeesStore = {
  employees: EmployeeListItem[];
  employeesFull: EmployeeListItem[];
  loading: boolean;
  loadingFull: boolean;
  loaded: boolean;
  loadedFull: boolean;
  fetchEmployees: (options?: { full?: boolean; force?: boolean }) => Promise<EmployeeListItem[]>;
  clearEmployeesCache: () => void;
};

export const useEmployeesStore = create<EmployeesStore>((set, get) => ({
  employees: [],
  employeesFull: [],
  loading: false,
  loadingFull: false,
  loaded: false,
  loadedFull: false,
  fetchEmployees: async (options) => {
    const full = Boolean(options?.full);
    const force = Boolean(options?.force);

    if (full) {
      if (get().loadingFull) return get().employeesFull;
      if (get().loadedFull && !force) return get().employeesFull;
      set({ loadingFull: true });
    } else {
      if (get().loading) return get().employees;
      if (get().loaded && !force) return get().employees;
      set({ loading: true });
    }

    try {
      const res = await fetch(full ? "/api/employees?list=full" : "/api/employees", {
        cache: "no-store",
      });
      const data = res.ok ? await res.json() : [];
      const rows = Array.isArray(data) ? data : [];
      if (full) {
        set({
          employeesFull: rows,
          loadingFull: false,
          loadedFull: true,
        });
      } else {
        set({
          employees: rows,
          loading: false,
          loaded: true,
        });
      }
      return rows;
    } catch {
      if (full) {
        set({ loadingFull: false });
      } else {
        set({ loading: false });
      }
      return [];
    }
  },
  clearEmployeesCache: () => {
    set({
      employees: [],
      employeesFull: [],
      loading: false,
      loadingFull: false,
      loaded: false,
      loadedFull: false,
    });
  },
}));

