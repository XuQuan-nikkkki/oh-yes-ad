"use client";

import { useMemo } from "react";
import { DatePicker, Select, Space } from "antd";
import dayjs from "dayjs";

type Props = {
  value?: dayjs.Dayjs;
  onChange?: (value?: dayjs.Dayjs) => void;
  placeholder?: string;
  disabled?: boolean;
};

const DISPLAY_DATE_FORMAT = "YYYY/M/D";

const clampNumber = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
};

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => {
  const value = String(index).padStart(2, "0");
  return { label: value, value };
});

const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => {
  const value = String(index).padStart(2, "0");
  return { label: value, value };
});

const normalizeValue = (value?: dayjs.Dayjs) =>
  value && dayjs.isDayjs(value) && value.isValid() ? value : undefined;

const DateTimePicker = ({
  value,
  onChange,
  placeholder = "请选择时间",
  disabled = false,
}: Props) => {
  const normalizedValue = useMemo(() => normalizeValue(value), [value]);
  const ensureValue = () => normalizedValue ?? dayjs().second(0).millisecond(0);

  const emitChange = (nextValue: dayjs.Dayjs) => {
    onChange?.(nextValue.second(0).millisecond(0));
  };

  const handleDateSelect = (nextDate: dayjs.Dayjs | null) => {
    if (!nextDate || !nextDate.isValid()) {
      onChange?.(undefined);
      return;
    }
    const current = ensureValue();
    emitChange(
      current
        .year(nextDate.year())
        .month(nextDate.month())
        .date(nextDate.date()),
    );
  };

  const handleTimeSelect = (part: "hour" | "minute", rawValue: string) => {
    const numeric = Number(rawValue);
    if (!Number.isFinite(numeric)) return;
    const current = ensureValue();
    const nextValue =
      part === "hour"
        ? current.hour(clampNumber(numeric, 0, 23))
        : current.minute(clampNumber(numeric, 0, 59));
    emitChange(nextValue);
  };

  return (
    <Space size={8} style={{ width: "100%" }} wrap>
      <DatePicker
        value={normalizedValue ?? null}
        format={DISPLAY_DATE_FORMAT}
        placeholder={placeholder}
        disabled={disabled}
        style={{ flex: 1, minWidth: 160 }}
        onChange={(nextDate) => handleDateSelect(nextDate)}
      />
      <Select
        showSearch
        disabled={disabled}
        value={
          normalizedValue
            ? String(normalizedValue.hour()).padStart(2, "0")
            : undefined
        }
        placeholder="小时"
        options={HOUR_OPTIONS}
        style={{ width: 88 }}
        onChange={(nextValue) => handleTimeSelect("hour", nextValue)}
        filterOption={(input, option) =>
          String(option?.label ?? "")
            .toLowerCase()
            .includes(input.toLowerCase())
        }
      />
      <Select
        showSearch
        disabled={disabled}
        value={
          normalizedValue
            ? String(normalizedValue.minute()).padStart(2, "0")
            : undefined
        }
        placeholder="分钟"
        options={MINUTE_OPTIONS}
        style={{ width: 88 }}
        onChange={(nextValue) => handleTimeSelect("minute", nextValue)}
        filterOption={(input, option) =>
          String(option?.label ?? "")
            .toLowerCase()
            .includes(input.toLowerCase())
        }
      />
    </Space>
  );
};

export default DateTimePicker;
