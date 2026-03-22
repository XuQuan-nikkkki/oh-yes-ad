export type WorkdayAdjustmentRange = {
  startDate: string;
  endDate: string;
  changeType?: string | null;
};

export type WorkdayAdjustment = WorkdayAdjustmentRange & {
  id: string;
  name?: string | null;
  changeType: string;
};
