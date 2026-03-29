type OptionValue = {
  id?: string;
  value?: string | null;
  color?: string | null;
} | null;

export type ProjectProgressPlannedEntryRow = {
  id: string;
  taskId: string;
  year: number;
  weekNumber: number;
  plannedDays: number;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
};

export type ProjectProgressTaskRow = {
  id: string;
  segmentId: string;
  segmentName: string;
  name: string;
  status?: string | null;
  statusOption?: OptionValue;
  ownerName: string;
  ownerId?: string | null;
  dueDate?: string | null;
  plannedEntries?: ProjectProgressPlannedEntryRow[];
};

export type ProjectProgressSegmentRow = {
  id: string;
  name: string;
  status?: string | null;
  statusOption?: OptionValue;
  ownerName: string;
  ownerId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  dueDate?: string | null;
  tasks: ProjectProgressTaskRow[];
};
