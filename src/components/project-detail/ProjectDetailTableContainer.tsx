"use client";

import type { CSSProperties, PropsWithChildren } from "react";

type Props = PropsWithChildren<{
  marginBottom?: number;
  style?: CSSProperties;
}>;

const ProjectDetailTableContainer = ({
  marginBottom = 16,
  style,
  children,
}: Props) => {
  return (
    <div
      style={{
        border: "1px solid #F0F0F0",
        borderRadius: 8,
        overflow: "hidden",
        background: "#fff",
        marginBottom,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default ProjectDetailTableContainer;
