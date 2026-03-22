"use client";

import SelectOptionTag from "@/components/SelectOptionTag";

type Props = {
  type?: string | null;
  typeOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
};

const MilestoneTypeValue = ({ type, typeOption }: Props) => {
  return (
    <SelectOptionTag
      option={
        typeOption?.value
          ? {
              id: typeOption.id ?? "",
              value: typeOption.value,
              color: typeOption.color ?? null,
            }
          : {
              id: "",
              value: type || "未分类",
              color: null,
            }
      }
    />
  );
};

export default MilestoneTypeValue;
