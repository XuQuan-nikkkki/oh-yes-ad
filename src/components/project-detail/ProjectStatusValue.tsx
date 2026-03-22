"use client";

import SelectOptionTag from "@/components/SelectOptionTag";

type Props = {
  status?: string | null;
  statusOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
};

const ProjectStatusValue = ({ status, statusOption }: Props) => {
  return (
    <SelectOptionTag
      option={
        statusOption?.value
          ? {
              id: statusOption.id ?? "",
              value: statusOption.value,
              color: statusOption.color ?? null,
            }
          : status
            ? {
                id: "",
                value: status,
                color: null,
              }
            : null
      }
    />
  );
};

export default ProjectStatusValue;
