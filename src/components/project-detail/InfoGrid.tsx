"use client";

import type { CSSProperties, ReactNode } from "react";

const titleStyle: CSSProperties = {
  color: "rgba(0,0,0,0.45)",
  fontSize: 14,
  lineHeight: "22px",
};

const valueTextStyle: CSSProperties = {
  fontSize: 16,
  lineHeight: "24px",
};

const descriptionTextStyle: CSSProperties = {
  color: "rgba(0,0,0,0.45)",
  fontSize: 12,
  lineHeight: "20px",
};

const rowTitleStyle: CSSProperties = {
  background: "#f5f5f5",
  color: "rgba(0,0,0,0.65)",
  fontSize: 12,
  fontWeight: 600,
  lineHeight: "20px",
  padding: "8px 24px",
};

const isPlainText = (node: ReactNode) =>
  typeof node === "string" || typeof node === "number";

const renderWithTextStyle = (node: ReactNode, style: CSSProperties) => {
  if (node === null || node === undefined) return null;
  if (isPlainText(node)) return <span style={style}>{node}</span>;
  return node;
};

export type InfoGridItemProps = {
  title: ReactNode;
  value?: ReactNode;
  description?: ReactNode;
  cornerTag?: ReactNode;
  colSpan?: number;
  minHeight?: number;
  style?: CSSProperties;
  className?: string;
};

export const InfoGridItem = ({
  title,
  value,
  description,
  cornerTag,
  colSpan = 1,
  minHeight,
  style,
  className,
}: InfoGridItemProps) => (
  <div
    className={className}
    style={{
      position: "relative",
      background: "#fff",
      padding: "18px 24px",
      minHeight: typeof minHeight === "number" ? minHeight : undefined,
      gridColumn: colSpan > 1 ? `span ${colSpan}` : undefined,
      ...style,
    }}
  >
    {title === null || title === undefined ? null : (
      <div style={titleStyle}>{title}</div>
    )}
    {value === null || value === undefined ? null : (
      <div style={{ marginTop: title === null || title === undefined ? 0 : 10 }}>
        {renderWithTextStyle(value, valueTextStyle)}
      </div>
    )}
    {description === null || description === undefined ? null : (
      <div style={{ marginTop: 8 }}>
        {renderWithTextStyle(description, descriptionTextStyle)}
      </div>
    )}
    {cornerTag === null || cornerTag === undefined ? null : (
      <span
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          padding: "2px 6px",
          borderRadius: 4,
          background: "#f5f5f5",
          color: "rgba(0,0,0,0.45)",
          fontSize: 12,
          lineHeight: "18px",
          pointerEvents: "none",
        }}
      >
        {cornerTag}
      </span>
    )}
  </div>
);

export type InfoGridProps = {
  columns?: number;
  children?: ReactNode;
  items?: InfoGridItemProps[];
  rows?: Array<{
    title?: ReactNode;
    titleStyle?: CSSProperties;
    columns: number;
    items: InfoGridItemProps[];
  }>;
  style?: CSSProperties;
  className?: string;
};

const InfoGrid = ({
  columns = 2,
  children,
  items,
  rows,
  style,
  className,
}: InfoGridProps) => {
  const hasRows = Array.isArray(rows) && rows.length > 0;

  return (
    <div
      className={className}
      style={{
        display: hasRows ? "flex" : "grid",
        flexDirection: hasRows ? "column" : undefined,
        gridTemplateColumns: hasRows
          ? undefined
          : `repeat(${columns}, minmax(0, 1fr))`,
        gap: 1,
        border: "1px solid #e5e5e5",
        borderRadius: 12,
        overflow: "hidden",
        background: "#e5e5e5",
        ...style,
      }}
    >
      {hasRows ? (
        rows.map((row, rowIndex) => (
          <div
            key={`row-${rowIndex}-${row.columns}-${String(row.title ?? "")}`}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.max(1, row.columns)}, minmax(0, 1fr))`,
              gap: 1,
            }}
          >
            {row.title === null || row.title === undefined ? null : (
              <div
                style={{
                  ...rowTitleStyle,
                  gridColumn: `span ${Math.max(1, row.columns)}`,
                  ...row.titleStyle,
                }}
              >
                {row.title}
              </div>
            )}
            {row.items.map((item, itemIndex) => (
              <InfoGridItem
                key={`row-${rowIndex}-item-${itemIndex}-${item.colSpan ?? 1}`}
                {...item}
              />
            ))}
          </div>
        ))
      ) : Array.isArray(items) ? (
        items.map((item, index) => (
          <InfoGridItem key={`${index}-${item.colSpan ?? 1}`} {...item} />
        ))
      ) : (
        children
      )}
    </div>
  );
};

export default InfoGrid;
