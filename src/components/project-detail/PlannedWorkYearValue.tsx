"use client";

import SelectOptionTag from "@/components/SelectOptionTag";

type OptionValue = {
  id: string;
  value: string;
  color?: string | null;
};

type Props = {
  year: number;
  optionMap?: Map<string, OptionValue>;
};

const PlannedWorkYearValue = ({ year, optionMap = new Map() }: Props) => {
  const text = String(year);
  const option = optionMap.get(text);

  return (
    <SelectOptionTag
      option={
        option
          ? { id: option.id, value: option.value, color: option.color ?? null }
          : { id: "", value: text, color: null }
      }
    />
  );
};

export default PlannedWorkYearValue;
