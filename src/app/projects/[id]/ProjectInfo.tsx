"use client";

import AppLink from "@/components/AppLink";
import BooleanTag from "@/components/BooleanTag";
import ProjectPeriodValue from "@/components/project-detail/ProjectPeriodValue";
import ProjectStageValue from "@/components/project-detail/ProjectStageValue";
import type { Project, WorkdayAdjustment } from "@/types/projectDetail";
import styles from "./ProjectInfo.module.css";

type Props = {
  project: Project;
  workdayAdjustments: WorkdayAdjustment[];
  onProjectUpdated?: (project: Project) => void;
};

const ProjectInfo = ({ project, workdayAdjustments, onProjectUpdated }: Props) => {
  const isInternalProject = project.type === "INTERNAL";

  return (
    <div className={styles.facts}>
      <div className={styles.fact}>
        <span className={styles.label}>所属客户：</span>
        {project.client ? (
          <AppLink href={`/clients/${project.client.id}`}>
            {project.client.name}
          </AppLink>
        ) : (
          <span>-</span>
        )}
      </div>

      <div className={styles.fact}>
        <span className={styles.label}>负责人：</span>
        {project.owner ? (
          <AppLink href={`/employees/${project.owner.id}`}>
            {project.owner.name}
          </AppLink>
        ) : (
          <span>-</span>
        )}
      </div>

      <div className={styles.fact}>
        <span className={styles.label}>服务内容：</span>
        <span className={styles.value}>{project.serviceContent?.trim() || "-"}</span>
      </div>

      <div className={styles.fact}>
        <span className={styles.label}>项目阶段：</span>
        {isInternalProject ? (
          <span>-</span>
        ) : (
          <ProjectStageValue
            projectId={project.id}
            stage={project.stage}
            stageOption={project.stageOption}
            onSaved={onProjectUpdated}
          />
        )}
      </div>

      <div className={styles.fact}>
        <span className={styles.label}>已归档：</span>
        <BooleanTag value={Boolean(project.isArchived)} />
      </div>

      <div className={styles.fact}>
        <span className={styles.label}>项目周期：</span>
        <span className={styles.period}>
          <ProjectPeriodValue
            startDate={project.startDate}
            endDate={project.endDate}
            adjustments={workdayAdjustments}
          />
        </span>
      </div>
    </div>
  );
};

export default ProjectInfo;
