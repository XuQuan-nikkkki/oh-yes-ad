"use client";

import { useEffect, useMemo, useState } from "react";
import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import type { NullableSelectOptionValue } from "@/types/selectOption";

type Props = {
  field?: string;
  option?: NullableSelectOptionValue;
  fallbackText?: string;
  rounded?: boolean;
  disabled?: boolean;
  onSaveSelection?: (
    option: { id: string; value: string; color: string },
  ) => void | Promise<void>;
  onUpdated?: () => void | Promise<void>;
  modalTitle?: string;
  fieldLabel?: string;
  fieldRequiredMessage?: string;
  inputPlaceholder?: string;
  successMessage?: string;
  editNotice?: React.ReactNode;
};

const SelectOptionTag = ({
  field,
  option,
  fallbackText = "-",
  disabled = false,
  onSaveSelection,
  onUpdated,
  modalTitle = "修改选项",
  fieldLabel = "选项值",
  successMessage = "选项已更新",
}: Props) => {
  const fetchAllOptions = useSelectOptionsStore((state) => state.fetchAllOptions);
  const optionsByField = useSelectOptionsStore((state) => state.optionsByField);
  const [fetchedField, setFetchedField] = useState("");

  const flattenedOptions = useMemo(
    () =>
      Object.entries(optionsByField).flatMap(([field, items]) =>
        (items ?? []).map((item) => ({
          id: item.id,
          field,
        })),
      ),
    [optionsByField],
  );

  const resolvedField =
    field ??
    option?.field ??
    flattenedOptions.find((item) => item.id === option?.id)?.field ??
    fetchedField;

  useEffect(() => {
    if (field || option?.field || !option?.id || resolvedField) return;

    let active = true;
    void (async () => {
      await fetchAllOptions(true);
      if (!active) return;
      const nextMatch = Object.entries(
        useSelectOptionsStore.getState().optionsByField,
      ).flatMap(([field, items]) =>
        (items ?? []).map((item) => ({
          id: item.id,
          field,
        })),
      ).find((item) => item.id === option.id);
      setFetchedField(nextMatch?.field ?? "");
    })();

    return () => {
      active = false;
    };
  }, [fetchAllOptions, field, option?.field, option?.id, resolvedField]);

  return (
    <SelectOptionQuickEditTag
      field={resolvedField}
      option={option}
      fallbackText={fallbackText}
      modalTitle={modalTitle}
      optionValueLabel={fieldLabel}
      saveSuccessText={successMessage}
      disabled={disabled || !resolvedField}
      onSaveSelection={onSaveSelection}
      onUpdated={onUpdated}
    />
  );
};

export default SelectOptionTag;
