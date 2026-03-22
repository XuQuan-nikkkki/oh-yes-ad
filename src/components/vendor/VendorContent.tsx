"use client";

import SelectOptionTag from "@/components/SelectOptionTag";
import BooleanValueTag from "@/components/BooleanValueTag";

type OptionTagValue = {
  id: string;
  value: string;
  color?: string | null;
} | null | undefined;

type OptionTagListValue = Array<{
  id: string;
  value: string;
  color?: string | null;
}>;

type OptionTagValueWithOptionalId = {
  id?: string;
  value: string;
  color?: string | null;
} | null | undefined;

export const VendorOptionValue = ({ option }: { option: OptionTagValue }) => {
  if (!option) return "-";
  return <SelectOptionTag option={option} />;
};

export const VendorOptionListValue = ({
  options,
  fallbackOption,
}: {
  options?: OptionTagListValue | null;
  fallbackOption?: OptionTagValueWithOptionalId;
}) => {
  if (options && options.length > 0) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {options.map((item) => (
          <SelectOptionTag key={item.id} option={item} />
        ))}
      </div>
    );
  }
  if (fallbackOption) {
    return (
      <SelectOptionTag
        option={{
          id: fallbackOption.id ?? "",
          value: fallbackOption.value,
          color: fallbackOption.color ?? null,
        }}
      />
    );
  }
  return "-";
};

export const VendorTextValue = ({
  value,
  preserveLineBreaks = false,
}: {
  value?: string | null;
  preserveLineBreaks?: boolean;
}) => {
  const text = value?.trim();
  if (!text) return "-";
  if (preserveLineBreaks) {
    return <div style={{ whiteSpace: "pre-wrap" }}>{text}</div>;
  }
  return text;
};

export const VendorLinkValue = ({ href }: { href?: string | null }) => {
  const link = href?.trim();
  if (!link) return "-";
  return (
    <a href={link} target="_blank" rel="noopener noreferrer">
      {link}
    </a>
  );
};

export const VendorBooleanValue = ({ value }: { value?: boolean }) => {
  return <BooleanValueTag value={Boolean(value)} />;
};
