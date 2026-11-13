"use client";

import AppLink from "@/components/AppLink";
import BooleanTag from "@/components/BooleanTag";
import ProjectPeriodValue from "@/components/project-detail/ProjectPeriodValue";
import ProjectStageValue from "@/components/project-detail/ProjectStageValue";
import ProjectTypeValue from "@/components/project-detail/ProjectTypeValue";
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
      <div className={styles.column}>
        <div className={styles.fact}>
          <span className={styles.label}>项目类型：</span>
          <ProjectTypeValue
            projectId={project.id}
            type={project.type}
            typeOption={project.typeOption}
          />
        </div>
        {!isInternalProject && (
          <div className={styles.fact}>
            <span className={styles.label}>项目阶段：</span>
            <ProjectStageValue
              projectId={project.id}
              stage={project.stage}
              stageOption={project.stageOption}
              onSaved={onProjectUpdated}
            />
          </div>
        )}
      </div>

      <div className={styles.column}>
        {!isInternalProject && project.client && (
          <div className={styles.fact}>
            <span className={styles.label}>所属客户：</span>
            <AppLink href={`/clients/${project.client.id}`}>
              {project.client.name}
            </AppLink>
          </div>
        )}
        <div className={styles.fact}>
          <span className={styles.label}>已归档：</span>
          <BooleanTag value={Boolean(project.isArchived)} />
        </div>
      </div>

      <div className={styles.column}>
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
          <span className={styles.label}>项目周期：</span>
          <span className={styles.period}>
            <ProjectPeriodValue
              startDate={project.startDate}
              endDate={project.endDate}
              adjustments={workdayAdjustments}
            />
          </span>
        </div>
        <div className={styles.fact}>
          <span className={styles.label}>服务内容：</span>
          <span>{project.serviceContent?.trim() || "-"}</span>
        </div>
      </div>
    </div>
  );
};

export default ProjectInfo;
