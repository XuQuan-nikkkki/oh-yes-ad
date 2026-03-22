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

const PROJECT_TYPE_MAP: Record<string, string> = {
  CLIENT: "客户项目",
  INTERNAL: "内部项目",
};

const ProjectTypeValue = ({ type, typeOption }: Props) => {
  return (
    <SelectOptionTag
      option={
        typeOption?.value
          ? {
              id: typeOption.id ?? "",
              value: typeOption.value,
              color: typeOption.color ?? null,
            }
          : type
            ? {
                id: "",
                value: PROJECT_TYPE_MAP[type] || type || "-",
                color: null,
              }
            : null
      }
    />
  );
};

export default ProjectTypeValue;
