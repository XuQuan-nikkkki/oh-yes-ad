export type {
  WorkdayAdjustment,
  WorkdayAdjustmentRange,
} from "@/types/workdayAdjustment";

export type PeriodInfo = {
  period: string;
  naturalDays: number;
  workdays: number;
  display: string;
};

export type Project = {
  id: string;
  name: string;
  type: string;
  status?: string | null;
  stage?: string | null;
  isArchived?: boolean | null;
  startDate?: string | null;
  endDate?: string | null;
  clientId?: string | null;
  ownerId?: string | null;
  client?: {
    id: string;
    name: string;
  } | null;
  owner?: {
    id: string;
    name: string;
  } | null;
  typeOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  statusOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  stageOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  vendors?: {
    id: string;
    name: string;
  }[];
  members?: {
    id: string;
    name: string;
    function?: string | null;
    employmentStatus?: string | null;
  }[];
  milestones?: {
    id: string;
    name: string;
    type?: string | null;
    typeOption?: {
      id?: string;
      value?: string | null;
      color?: string | null;
    } | null;
    startAt?: string | null;
    endAt?: string | null;
    datePrecision?: "DATE" | "DATETIME" | null;
    date?: string | null;
    location?: string | null;
    method?: string | null;
    methodOption?: {
      id?: string;
      value?: string | null;
      color?: string | null;
    } | null;
    internalParticipants?: {
      id: string;
      name: string;
    }[];
    clientParticipants?: {
      id: string;
      name: string;
    }[];
    vendorParticipants?: {
      id: string;
      name: string;
    }[];
  }[];
  segments?: {
    id: string;
    name: string;
    status?: string | null;
    statusOption?: {
      id?: string;
      value?: string | null;
      color?: string | null;
    } | null;
    dueDate?: string | null;
    owner?: {
      id: string;
      name: string;
    } | null;
    projectTasks?: {
      id: string;
      name: string;
      status?: string | null;
      segmentId: string;
      owner?: {
        id: string;
        name: string;
      } | null;
      dueDate?: string | null;
      plannedWorkEntries?: {
        id: string;
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
      }[];
    }[];
  }[];
  actualWorkEntries?: {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    employee?: { id: string; name: string };
  }[];
  documents?: {
    id: string;
    name: string;
    typeOption?: {
      id?: string;
      value?: string | null;
      color?: string | null;
    } | null;
    date?: string | null;
    isFinal: boolean;
    internalLink?: string | null;
    milestone?: { id: string; name: string } | null;
  }[];
  periodInfo?: PeriodInfo;
};

export type ClientContact = {
  id: string;
  name: string;
};

export type Employee = {
  id: string;
  name: string;
  employmentStatus?: string | null;
  function?: string | null;
};

export type PlannedWorkRow = {
  id: string;
  taskId: string;
  taskDisplayName?: string;
  taskOwnerName?: string;
  year?: number;
  weekNumber?: number;
  plannedDays?: number;
  monday?: boolean;
  tuesday?: boolean;
  wednesday?: boolean;
  thursday?: boolean;
  friday?: boolean;
  saturday?: boolean;
  sunday?: boolean;
};
