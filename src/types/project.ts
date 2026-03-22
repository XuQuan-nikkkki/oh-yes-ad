export type Project = {
  id: string;
  name: string;
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
};
