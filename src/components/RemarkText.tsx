"use client";

type Props = {
  remark?: string | null;
  remarkNeedsAttention?: boolean | null;
};

const RemarkText = ({ remark, remarkNeedsAttention = false }: Props) => {
  const value = remark?.trim() ?? "";
  if (!value) return <span>-</span>;

  return (
    <span style={remarkNeedsAttention ? { color: "#ff4d4f" } : undefined}>
      {value}
    </span>
  );
};

export default RemarkText;
