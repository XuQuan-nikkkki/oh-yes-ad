"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { Button, Select, Tag } from "antd";
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
  style?: CSSProperties;
  className?: string;
};

const normalizeHexColor = (raw?: string | null) => {
  if (!raw) return DEFAULT_COLOR;
  const color = raw.trim();
  if (!color) return DEFAULT_COLOR;
  if (/^#([0-9a-fA-F]{8})$/.test(color)) {
    return color.slice(0, 7);
  }
  if (/^#([0-9a-fA-F]{6})$/.test(color)) {
    return color;
  }
  const rgbMatch = color.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+\s*)?\)$/i,
  );
  if (rgbMatch) {
    const [, red, green, blue] = rgbMatch;
    return `#${[red, green, blue]
      .map((value) =>
        Math.max(0, Math.min(255, Number(value)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")}`;
  }
  return color.startsWith("#") ? color : `#${color}`;
};

const SelectOptionSelector = ({
  value,
  onChange,
  options,
  placeholder = "请选择",
  allowClear = true,
  disabled = false,
  createButtonText = "新增选项",
  existsText = "已存在同名选项",
  style,
  className,
}: Props) => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const normalizedOptions = useMemo(
    () => {
      const items = options.map((item) => ({
        label: item.label ?? item.value,
        value: item.value,
        color: normalizeHexColor(item.color),
      }));
      if (
        value &&
        typeof value === "object" &&
        value.isNew &&
        value.value.trim() &&
        !items.some((item) => item.value === value.value)
      ) {
        items.unshift({
          label: value.value,
          value: value.value,
          color: DEFAULT_COLOR,
        });
      }
      return items;
    },
    [options, value],
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
        open={open}
        onOpenChange={setOpen}
        value={selectedValue}
        onSearch={setSearch}
        onClear={() => onChange?.(undefined)}
        onChange={(nextValue) => {
          setOpen(false);
          setSearch("");
          if (!nextValue) {
            onChange?.(undefined);
            return;
          }
          onChange?.(String(nextValue));
        }}
        options={normalizedOptions}
        className={className}
        style={{ width: "100%", ...style }}
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
                  setOpen(false);
                  setSearch("");
                }}
              >
                {hasExact ? existsText : `${createButtonText}: ${keyword || ""}`}
              </Button>
            </div>
          </>
        )}
      />
    </>
  );
};

export default SelectOptionSelector;
