"use client";

type Props = {
  isFirst: boolean;
  isLast: boolean;
};

export default function TimelineCell({ isFirst, isLast }: Props) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        justifyContent: "center",
        width: 24,
        minHeight: 46,
        flexShrink: 0,
      }}
    >
      {!isFirst ? (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: "50%",
            left: "50%",
            width: 2,
            transform: "translateX(-50%)",
            background: "#d9d9d9",
          }}
        />
      ) : null}
      {!isLast ? (
        <div
          style={{
            position: "absolute",
            top: "50%",
            bottom: 0,
            left: "50%",
            width: 2,
            transform: "translateX(-50%)",
            background: "#d9d9d9",
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 14,
          height: 14,
          borderRadius: "50%",
          transform: "translate(-50%, -50%)",
          background: "#d9d9d9",
          border: "2px solid #fff",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
