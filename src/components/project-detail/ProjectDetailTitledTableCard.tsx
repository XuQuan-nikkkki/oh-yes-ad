"use client";

import type { PropsWithChildren } from "react";
import ProjectDetailTableContainer from "@/components/project-detail/ProjectDetailTableContainer";

type Props = PropsWithChildren<{
  projectName?: string;
  estimatedDuration?: number | string | null;
  titleSuffix?: string;
  titleType?: string;
  marginBottom?: number;
}>;

const ProjectDetailTitledTableCard = ({
  projectName,
  estimatedDuration,
  titleSuffix,
  titleType,
  marginBottom = 16,
  children,
}: Props) => {
  const suffix = titleSuffix ?? titleType ?? "";

  return (
    <ProjectDetailTableContainer marginBottom={marginBottom}>
      <div
        style={{
          textAlign: "center",
          padding: "20px 16px",
          borderBottom: "1px solid #f0f0f0",
          background: "#fafafa",
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 700 }}>
          {`【${projectName || "未命名项目"}】${suffix}`}
        </span>
        <span
          style={{
            marginLeft: 12,
            fontSize: 14,
            fontWeight: 500,
            color: "rgba(0,0,0,0.45)",
          }}
        >
          {`${estimatedDuration ?? "-"}个工作日`}
        </span>
      </div>
      {children}
    </ProjectDetailTableContainer>
  );
};

export default ProjectDetailTitledTableCard;
