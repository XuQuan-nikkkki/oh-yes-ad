"use client";

import type { ReactNode } from "react";
import { Space } from "antd";
import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";
import type { NullableSelectOptionValue } from "@/types/selectOption";

type Props = {
  field: string;
  options?: NullableSelectOptionValue[] | null;
  fallback?: ReactNode;
};

const MultipleSelectOptions = ({ field, options, fallback = "-" }: Props) => {
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
        />
      ))}
    </Space>
  );
};

export default MultipleSelectOptions;
