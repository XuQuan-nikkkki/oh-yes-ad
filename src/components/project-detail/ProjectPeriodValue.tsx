"use client";

import { formatProjectPeriod } from "@/lib/workday";
import type { WorkdayAdjustmentRange } from "@/types/workdayAdjustment";

type Props = {
  startDate?: string | null;
  endDate?: string | null;
  adjustments?: WorkdayAdjustmentRange[];
};

const ProjectPeriodValue = ({ startDate, endDate, adjustments = [] }: Props) => {
  return <>{formatProjectPeriod(startDate, endDate, adjustments)}</>;
};

export default ProjectPeriodValue;
