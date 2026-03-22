"use client";

import { Descriptions } from "antd";
import AppLink from "@/components/AppLink";
import BooleanTag from "@/components/BooleanTag";
import ProjectPeriodValue from "@/components/project-detail/ProjectPeriodValue";
import ProjectStageValue from "@/components/project-detail/ProjectStageValue";
import ProjectStatusValue from "@/components/project-detail/ProjectStatusValue";
import ProjectTypeValue from "@/components/project-detail/ProjectTypeValue";
import type { Project, WorkdayAdjustment } from "@/types/projectDetail";

type Props = {
  project: Project;
  workdayAdjustments: WorkdayAdjustment[];
};

const titleStyle = { fontSize: "14px", fontWeight: 500 } as const;
const sectionStyle = { marginBottom: "24px" } as const;

const ProjectInfo = ({ project, workdayAdjustments }: Props) => {
  const isInternalProject = project.type === "INTERNAL";

  return (
    <>
      <Descriptions
        title={<span style={titleStyle}>基础信息</span>}
        column={3}
        size="small"
        style={sectionStyle}
      >
        <Descriptions.Item label="项目类型">
          <ProjectTypeValue
            type={project.type}
            typeOption={project.typeOption}
          />
        </Descriptions.Item>
        {!isInternalProject && project.client ? (
          <Descriptions.Item label="所属客户">
            <AppLink href={`/clients/${project.client.id}`}>
              {project.client.name}
            </AppLink>
          </Descriptions.Item>
        ) : null}
        <Descriptions.Item label="负责人">
          {project.owner ? (
            <AppLink href={`/employees/${project.owner.id}`}>
              {project.owner.name}
            </AppLink>
          ) : (
            "-"
          )}
        </Descriptions.Item>
      </Descriptions>

      {isInternalProject ? (
        <Descriptions
          title={<span style={titleStyle}>项目进度</span>}
          column={3}
          size="small"
          style={sectionStyle}
        >
          <Descriptions.Item label="项目周期" span={1}>
            <ProjectPeriodValue
              startDate={project.startDate}
              endDate={project.endDate}
              adjustments={workdayAdjustments}
            />
          </Descriptions.Item>
          <Descriptions.Item label="已归档">
            <BooleanTag value={Boolean(project.isArchived)} />
          </Descriptions.Item>
        </Descriptions>
      ) : (
        <Descriptions
          title={<span style={titleStyle}>项目进度</span>}
          column={3}
          size="small"
          style={sectionStyle}
        >
          <Descriptions.Item label="项目状态">
            <ProjectStatusValue
              status={project.status}
              statusOption={project.statusOption}
            />
          </Descriptions.Item>
          <Descriptions.Item label="项目阶段">
            <ProjectStageValue
              stage={project.stage}
              stageOption={project.stageOption}
            />
          </Descriptions.Item>
          <Descriptions.Item label="已归档">
            <BooleanTag value={Boolean(project.isArchived)} />
          </Descriptions.Item>
          <Descriptions.Item label="项目周期" span={3}>
            <ProjectPeriodValue
              startDate={project.startDate}
              endDate={project.endDate}
              adjustments={workdayAdjustments}
            />
          </Descriptions.Item>
        </Descriptions>
      )}
    </>
  );
};

export default ProjectInfo;
