"use client";

import type { ReactNode } from "react";
import { Space } from "antd";
import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";
import { EXECUTION_COST_FIELD, resolveExecutionCostTagColor } from "@/lib/execution-cost";
import type { NullableSelectOptionValue } from "@/types/selectOption";

type Props = {
  field: string;
  options?: NullableSelectOptionValue[] | null;
  fallback?: ReactNode;
  disabled?: boolean;
};

const MultipleSelectOptions = ({ field, options, fallback = "-", disabled = false }: Props) => {
  const visibleOptions = (options ?? [])
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => Boolean(item.value));

  if (visibleOptions.length === 0) return <>{fallback}</>;

  return (
    <Space size={[8, 8]} wrap>
      {visibleOptions.map((item, index) => (
        <SelectOptionQuickEditTag
          key={item.id ?? `${item.value ?? "option"}-${index}`}
          field={field}
          option={item}
          disabled={disabled}
          tagColor={field === EXECUTION_COST_FIELD ? resolveExecutionCostTagColor(item.value, item.color) : undefined}
        />
      ))}
    </Space>
  );
};

export default MultipleSelectOptions;
