import type { CSSProperties, ReactNode } from "react";

type CompositionRatioItem = {
  text: string;
  percent: number;
  color: string;
};

type Props = {
  title?: ReactNode;
  items: CompositionRatioItem[];
  style?: CSSProperties;
  className?: string;
  showLegend?: boolean;
  legendWithPercent?: boolean;
  showBar?: boolean;
  barOpacity?: number;
  legendColumns?: number;
};

const containerStyle: CSSProperties = {
  fontSize: 12,
  lineHeight: 1.4,
};

const titleStyle: CSSProperties = {
  marginBottom: 8,
  color: "rgba(0,0,0,0.65)",
  fontSize: 12,
  fontWeight: 700,
};

const barStyle: CSSProperties = {
  width: "100%",
  height: 6,
  borderRadius: 4,
  overflow: "hidden",
  background: "#f0f0f0",
  display: "flex",
};

const getLegendStyle = (legendColumns?: number): CSSProperties => ({
  display: typeof legendColumns === "number" && legendColumns > 0 ? "grid" : "flex",
  gridTemplateColumns:
    typeof legendColumns === "number" && legendColumns > 0
      ? `repeat(${legendColumns}, minmax(0, 1fr))`
      : undefined,
  flexWrap:
    typeof legendColumns === "number" && legendColumns > 0 ? undefined : "wrap",
  gap: "6px 16px",
  marginTop: 8,
  fontSize: 12,
  color: "rgba(0,0,0,0.85)",
});

const legendItemStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const legendColorStyle = (color: string, opacity: number): CSSProperties => ({
  width: 8,
  height: 8,
  borderRadius: 2,
  background: color,
  opacity,
  flexShrink: 0,
});

const normalizeItems = (items: CompositionRatioItem[]) =>
  items
    .filter((item) => Number(item.percent) > 0)
    .map((item) => ({
      ...item,
      percent: Number(item.percent),
    }));

const formatPercent = (value: number) => {
  if (!Number.isFinite(value)) return "0";
  const fixed = value.toFixed(1);
  return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
};

const CompositionRatioBar = ({
  title,
  items,
  style,
  className,
  showLegend = true,
  legendWithPercent = true,
  showBar = true,
  barOpacity = 1,
  legendColumns,
}: Props) => {
  const normalizedItems = normalizeItems(items);
  const total = normalizedItems.reduce((sum, item) => sum + item.percent, 0);
  const normalizedOpacity = Math.max(0, Math.min(1, barOpacity));

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      {title ? <div style={titleStyle}>{title}</div> : null}

      {showBar ? (
        <div style={barStyle}>
          {normalizedItems.map((item) => {
            const widthPercent = total > 0 ? (item.percent / total) * 100 : 0;
            return (
              <div
                key={`${item.text}-${item.color}`}
                style={{
                  width: `${widthPercent}%`,
                  background: item.color,
                  opacity: normalizedOpacity,
                }}
              />
            );
          })}
        </div>
      ) : null}

      {showLegend ? (
        <div style={getLegendStyle(legendColumns)}>
          {normalizedItems.map((item) => {
            const percentOfTotal = total > 0 ? (item.percent / total) * 100 : 0;
            return (
              <span key={`legend-${item.text}-${item.color}`} style={legendItemStyle}>
                <span style={legendColorStyle(item.color, normalizedOpacity)} />
                <span>
                  {legendWithPercent
                    ? `${item.text} ${formatPercent(percentOfTotal)}%`
                    : item.text}
                </span>
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export type { CompositionRatioItem };
export default CompositionRatioBar;
