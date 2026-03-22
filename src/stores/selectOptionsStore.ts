import { create } from "zustand";

export type SelectOption = {
  id: string;
  field: string;
  value: string;
  color?: string | null;
  order?: number | null;
  createdAt: string;
};

type SelectOptionsStore = {
  options: SelectOption[];
  optionsByField: Record<string, SelectOption[]>;
  loading: boolean;
  loaded: boolean;
  error: string | null;
  fetchAllOptions: (force?: boolean) => Promise<void>;
};

const toByField = (options: SelectOption[]) =>
  options.reduce<Record<string, SelectOption[]>>((acc, option) => {
    if (!acc[option.field]) {
      acc[option.field] = [];
    }
    acc[option.field].push(option);
    return acc;
  }, {});

// 外部缓存，避免重复创建对象
let cachedOptions: SelectOption[] = [];
let cachedByField: Record<string, SelectOption[]> = {};

export const useSelectOptionsStore = create<SelectOptionsStore>((set, get) => ({
  options: [],
  optionsByField: {},
  loading: false,
  loaded: false,
  error: null,
  fetchAllOptions: async (force = false) => {
    if (get().loading) return;
    if (get().loaded && !force) return;

    set({ loading: true, error: null });

    try {
      const res = await fetch("/api/select-options/all", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`加载选项失败: ${res.status}`);
      }

      const data = (await res.json()) as {
        options?: SelectOption[];
        optionsByField?: Record<string, SelectOption[]>;
      };

      const options = Array.isArray(data.options) ? data.options : [];
      const optionsByField = data.optionsByField ?? toByField(options);

      // 只有当数据真正改变时才更新缓存和状态
      const dataChanged =
        JSON.stringify(cachedOptions) !== JSON.stringify(options);

      if (dataChanged) {
        cachedOptions = options;
        cachedByField = optionsByField;
      }

      set({
        options: cachedOptions,
        optionsByField: cachedByField,
        loaded: true,
        loading: false,
        error: null,
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "加载选项失败",
      });
    }
  },
}));
