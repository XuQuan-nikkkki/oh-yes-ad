export type SelectOptionItem = {
  id: string;
  field: string;
  value: string;
  color?: string | null;
  order?: number | null;
  createdAt: string;
};

export type SelectOptionValue = {
  id?: string;
  field?: string;
  value?: string | null;
  color?: string | null;
};

export type NullableSelectOptionValue = SelectOptionValue | null | undefined;
export type NullableSelectOptionTextValue =
  | Pick<SelectOptionValue, "value">
  | null
  | undefined;

export const EMPTY_SELECT_OPTIONS: SelectOptionItem[] = [];
