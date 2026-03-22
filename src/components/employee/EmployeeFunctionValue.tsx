"use client";

import SelectOptionTag from "@/components/SelectOptionTag";

type FunctionOption = {
  id?: string;
  value?: string | null;
  color?: string | null;
} | null | undefined;

type Props = {
  functionOption?: FunctionOption;
  fallbackText?: string;
};

const EmployeeFunctionValue = ({
  functionOption,
  fallbackText = "-",
}: Props) => {
  if (!functionOption?.value) return fallbackText;
  return (
    <SelectOptionTag
      option={{
        id: functionOption.id ?? "",
        value: functionOption.value,
        color: functionOption.color ?? null,
      }}
    />
  );
};

export default EmployeeFunctionValue;
