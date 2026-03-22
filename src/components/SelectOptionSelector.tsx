"use client";

import { useMemo, useState } from "react";
import { Button, ColorPicker, Select, Tag } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import { DEFAULT_COLOR } from "@/lib/constants";

export type SelectOptionSelectorOption = {
  value: string;
  label?: string;
  color?: string | null;
};

export type SelectOptionSelectorValue =
  | string
  | {
      value: string;
      color?: string | null;
      isNew?: true;
    };

type Props = {
  value?: SelectOptionSelectorValue;
  onChange?: (value?: SelectOptionSelectorValue) => void;
  options: SelectOptionSelectorOption[];
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  createButtonText?: string;
  existsText?: string;
};

const SelectOptionSelector = ({
  value,
  onChange,
  options,
  placeholder = "请选择",
  allowClear = true,
  disabled = false,
  createButtonText = "新增并选择颜色",
  existsText = "已存在同名选项",
}: Props) => {
  const [search, setSearch] = useState("");
  const isNewValue = Boolean(
    value && typeof value === "object" && value.isNew,
  );
  const selectedColor =
    value && typeof value === "object" && value.color
      ? value.color
      : DEFAULT_COLOR;

  const normalizedOptions = useMemo(
    () =>
      options.map((item) => ({
        label: item.label ?? item.value,
        value: item.value,
        color: item.color ?? DEFAULT_COLOR,
      })),
    [options],
  );

  const selectedValue = typeof value === "string" ? value : value?.value;
  const keyword = search.trim();
  const hasExact = keyword
    ? normalizedOptions.some(
        (item) => item.value.toLowerCase() === keyword.toLowerCase(),
      )
    : false;
  const canCreate = Boolean(keyword) && !hasExact;

  return (
    <>
      <Select
      allowClear={allowClear}
      disabled={disabled}
      placeholder={placeholder}
      showSearch
      value={selectedValue}
      onSearch={setSearch}
      onClear={() => onChange?.(undefined)}
      onChange={(nextValue) => {
        setSearch("");
        if (!nextValue) {
          onChange?.(undefined);
          return;
        }
        onChange?.(String(nextValue));
      }}
      options={normalizedOptions}
      optionRender={(option) => {
        const optionData = option.data as DefaultOptionType & { color?: string };
        return (
          <Tag color={optionData.color ?? DEFAULT_COLOR} style={{ borderRadius: 6 }}>
            {String(optionData.label ?? "")}
          </Tag>
        );
      }}
      popupRender={(menu) => (
        <>
          {menu}
          <div style={{ borderTop: "1px solid #f0f0f0", padding: 8 }}>
            <Button
              type="link"
              style={{ padding: 0 }}
              disabled={!canCreate}
              onClick={() => {
                if (!canCreate) return;
                onChange?.({
                  value: keyword,
                  color: DEFAULT_COLOR,
                  isNew: true,
                });
                setSearch("");
              }}
            >
              {hasExact ? existsText : `${createButtonText}: ${keyword || ""}`}
            </Button>
          </div>
        </>
      )}
    />
      {isNewValue ? (
        <div style={{ marginTop: 8 }}>
          <div style={{ marginBottom: 6, color: DEFAULT_COLOR }}>新增并选择颜色：</div>
          <ColorPicker
            value={selectedColor}
            showText
            onChange={(_, hex) => {
              if (!value || typeof value === "string") return;
              onChange?.({
                value: value.value,
                color: hex,
                isNew: true,
              });
            }}
          />
        </div>
      ) : null}
    </>
  );
};

export default SelectOptionSelector;
