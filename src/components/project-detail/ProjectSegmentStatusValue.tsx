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

const ProjectSegmentStatusValue = ({ status, statusOption }: Props) => {
  return (
    <SelectOptionTag
      option={
        statusOption?.value
          ? {
              id: statusOption.id ?? "",
              value: statusOption.value,
              color: statusOption.color ?? null,
            }
          : null
      }
      fallbackText={status || "-"}
    />
  );
};

export default ProjectSegmentStatusValue;
