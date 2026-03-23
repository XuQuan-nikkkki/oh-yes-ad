"use client";

import { Typography } from "antd";
import type { CSSProperties, ReactNode } from "react";

type Props = {
  text?: string | null;
  fallback?: ReactNode;
  minWidth?: number;
  maxWidth?: number;
  highlight?: boolean;
};

const EllipsisPopoverText = ({
  text,
  fallback = "-",
  minWidth,
  maxWidth,
  highlight = false,
}: Props) => {
  const value = text?.trim() ?? "";
  if (!value) return <span>{fallback}</span>;

  const style: CSSProperties = {
    display: "inline-block",
    minWidth,
    maxWidth,
    color: highlight ? "#ff4d4f" : undefined,
  };

  return (
    <Typography.Text
      type={highlight ? "danger" : undefined}
      style={style}
      ellipsis={{ tooltip: value }}
    >
      {value}
    </Typography.Text>
  );
};

export default EllipsisPopoverText;
