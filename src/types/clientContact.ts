export type ClientContact = {
  id: string;
  name: string;
  order?: number;
  title?: string | null;
  scope?: string | null;
  preference?: string | null;
  phone?: string | null;
  email?: string | null;
  wechat?: string | null;
  address?: string | null;
  clientIds?: string[];
  client?: {
    id: string;
    name: string;
  } | null;
  clients?: {
    id: string;
    name: string;
  }[];
};
