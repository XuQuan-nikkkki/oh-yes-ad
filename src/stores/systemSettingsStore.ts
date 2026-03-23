import { create } from "zustand";

export type SystemSettingValueType =
  | "number"
  | "percent"
  | "boolean"
  | "text"
  | "json";

export type SystemSettingRecord = {
  id: string;
  key: string;
  name: string;
  group: string;
  value: string;
  valueType: SystemSettingValueType;
  unit?: string | null;
  description?: string | null;
  order?: number | null;
  updatedById?: string | null;
  createdAt: string;
  updatedAt: string;
};

type SystemSettingsStore = {
  records: SystemSettingRecord[];
  loading: boolean;
  loaded: boolean;
  fetchSystemSettings: (force?: boolean) => Promise<SystemSettingRecord[]>;
  upsertSystemSetting: (record: SystemSettingRecord) => void;
  removeSystemSetting: (id: string) => void;
  clearSystemSettingsCache: () => void;
};

const sortRecords = (records: SystemSettingRecord[]) =>
  [...records].sort((left, right) => {
    const groupCompare = left.group.localeCompare(right.group, "zh-CN");
    if (groupCompare !== 0) return groupCompare;

    const leftOrder = left.order ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.order ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;

    return left.name.localeCompare(right.name, "zh-CN");
  });

export const useSystemSettingsStore = create<SystemSettingsStore>((set, get) => ({
  records: [],
  loading: false,
  loaded: false,
  fetchSystemSettings: async (force = false) => {
    if (get().loading) return get().records;
    if (get().loaded && !force) return get().records;

    set({ loading: true });
    try {
      const res = await fetch("/api/system-settings", { cache: "no-store" });
      if (!res.ok) {
        throw new Error((await res.text()) || "获取系统参数失败");
      }
      const data = await res.json();
      const records = Array.isArray(data)
        ? sortRecords(data as SystemSettingRecord[])
        : [];
      set({
        records,
        loading: false,
        loaded: true,
      });
      return records;
    } catch {
      set({ loading: false });
      return get().records;
    }
  },
  upsertSystemSetting: (record) => {
    set((state) => {
      const existingIndex = state.records.findIndex((item) => item.id === record.id);
      const nextRecords =
        existingIndex >= 0
          ? state.records.map((item) => (item.id === record.id ? record : item))
          : [...state.records, record];
      return {
        records: sortRecords(nextRecords),
        loaded: true,
      };
    });
  },
  removeSystemSetting: (id) => {
    set((state) => ({
      records: state.records.filter((item) => item.id !== id),
    }));
  },
  clearSystemSettingsCache: () => {
    set({
      records: [],
      loading: false,
      loaded: false,
    });
  },
}));
