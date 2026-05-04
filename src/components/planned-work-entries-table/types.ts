import type { ReactNode } from "react";
import type { WorkdayAdjustmentRange } from "@/types/workdayAdjustment";

export type PlannedWorkEntryRow = {
  id: string;
  year?: number | null;
  weekNumber?: number | null;
  yearOption?: { id?: string; value?: string | null; color?: string | null } | null;
  weekNumberOption?: { id?: string; value?: string | null; color?: string | null } | null;
  plannedDays: number;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  task?: {
    id: string;
    name: string;
    owner?: { id: string; name: string } | null;
    segment?: { id: string; name: string; project?: { id: string; name: string } };
  };
};

export type PlannedWorkColumnKey =
  | "name"
  | "projectName"
  | "segmentName"
  | "taskName"
  | "ownerName"
  | "year"
  | "month"
  | "weekNumber"
  | "plannedDays"
  | "actions";

type RawFilterOption = { text?: string; label?: string; value: string };

export type PlannedWorkEntriesTableProps = {
  requestData: (params: {
    current: number;
    pageSize: number;
    filters: {
      projectName?: string;
      segmentName?: string;
      taskName?: string;
      ownerName?: string;
      year?: string;
      weekNumber?: string;
    };
  }) => Promise<{ data: PlannedWorkEntryRow[]; total: number }>;
  onEdit: (row: PlannedWorkEntryRow) => void;
  onDelete: (id: string) => void;
  headerTitle?: ReactNode;
  toolbarActions?: ReactNode[];
  workdayAdjustments?: WorkdayAdjustmentRange[];
  refreshKey?: number;
  showTableOptions?: boolean;
  actionsDisabled?: boolean;
  projectFilterOptions?: RawFilterOption[];
  segmentFilterOptions?: RawFilterOption[];
  taskFilterOptions?: RawFilterOption[];
  ownerFilterOptions?: RawFilterOption[];
  yearFilterOptions?: RawFilterOption[];
  weekNumberFilterOptions?: RawFilterOption[];
  columnKeys?: PlannedWorkColumnKey[];
  renderYearCell?: (row: PlannedWorkEntryRow) => ReactNode;
  monthTitle?: ReactNode;
  renderMonthCell?: (row: PlannedWorkEntryRow) => ReactNode;
};
