import { useMemo } from "react";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import { EMPTY_SELECT_OPTIONS } from "@/types/selectOption";

/**
 * 获取特定 field 的 select options
 * 使用 useMemo 缓存结果，防止 Zustand selector 导致的无限重新渲染
 */
export const useSelectOptionsByField = (field: string) => {
  const optionsByField = useSelectOptionsStore((state) => state.optionsByField);

  return useMemo(() => {
    return optionsByField[field] ?? EMPTY_SELECT_OPTIONS;
  }, [optionsByField, field]);
};
