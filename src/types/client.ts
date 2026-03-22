export type SimpleClient = {
  id: string;
  name: string;
};

export type Client = {
  id: string;
  name: string;
  industryOptionId: string;
  industryOption?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
};
