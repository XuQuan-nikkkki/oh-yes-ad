export type ProjectCostSourceMode = "AUTO" | "MANUAL";

export type ProjectManualCost = {
  agencyFeeAmount?: number | null;
  agencyFeeRemark?: string | null;
  outsourceAmount?: number | null;
  outsourceRemark?: string | null;
  laborAmount?: number | null;
  laborRemark?: string | null;
  rentAmount?: number | null;
  rentRemark?: string | null;
  middleOfficeAmount?: number | null;
  middleOfficeRemark?: string | null;
  executionAmount?: number | null;
  executionRemark?: string | null;
} | null;

export type Project = {
  id: string;
  name: string;
  costSourceMode?: ProjectCostSourceMode;
  type?: string | null;
  isArchived?: boolean | null;
  status?: string | null;
  stage?: string | null;
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
  statusOption?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
  stageOption?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
  typeOption?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
  manualCost?: ProjectManualCost;
};
