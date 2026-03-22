"use client";

import SelectOptionTag from "@/components/SelectOptionTag";

type OptionValue = {
  id: string;
  value: string;
  color?: string | null;
};

type Props = {
  weekNumber: number;
  optionMap?: Map<string, OptionValue>;
};

const PlannedWorkWeekValue = ({ weekNumber, optionMap = new Map() }: Props) => {
  const text = String(weekNumber);
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

export default PlannedWorkWeekValue;
