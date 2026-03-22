"use client";

import type { ReactNode } from "react";
import { Collapse, Space, Typography } from "antd";
import { ProCard } from "@ant-design/pro-components";
import AppLink from "@/components/AppLink";
import SelectOptionTag from "@/components/SelectOptionTag";

type ProjectListItemView = {
  id: string;
  name: string;
};

type GroupedVisibleProject = {
  status: string;
  statusOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  projects: ProjectListItemView[];
};

type SelectedProjectView = {
  id: string;
  name: string;
} | null;

type Props = {
  visibleProjectCount: number;
  groupedVisibleProjects: GroupedVisibleProject[];
  selectedClientProject: SelectedProjectView;
  customerScheduleContent: ReactNode;
  onSelectProject: (projectId: string) => void;
};

const ClientProjectSchedulePane = ({
  visibleProjectCount,
  groupedVisibleProjects,
  selectedClientProject,
  customerScheduleContent,
  onSelectProject,
}: Props) => {
  return (
    <ProCard
      split="vertical"
      bordered
      style={{ width: "100%", minWidth: 0, overflow: "hidden" }}
    >
      <ProCard
        colSpan="200px"
        title="项目列表"
        style={{
          minHeight: 520,
          flex: "0 0 200px",
          minWidth: 200,
          maxWidth: 200,
          borderInlineEnd: "1px solid #f0f0f0",
        }}
      >
        <Space orientation="vertical" size={8} style={{ width: "100%" }}>
          <Typography.Text type="secondary">
            共 {visibleProjectCount} 个项目
          </Typography.Text>
          {visibleProjectCount === 0 ? (
            <Typography.Text type="secondary">暂无匹配项目</Typography.Text>
          ) : (
            <Collapse
              size="small"
              ghost
              styles={{
                header: { padding: 0 },
                body: { paddingTop: 6 },
              }}
              items={groupedVisibleProjects.map((group) => ({
                key: group.status,
                label: (
                  <Space size={6}>
                    <SelectOptionTag
                      option={
                        group.statusOption?.value
                          ? {
                              id: group.statusOption.id ?? "",
                              value: group.statusOption.value,
                              color: group.statusOption.color ?? null,
                            }
                          : {
                              id: "",
                              value: group.status,
                              color: null,
                            }
                      }
                      fallbackText={group.status}
                    />
                    <Typography.Text type="secondary">
                      （{group.projects.length}）
                    </Typography.Text>
                  </Space>
                ),
                style: {
                  marginBottom: 8,
                },
                children: (
                  <Space orientation="vertical" size={6} style={{ width: "100%" }}>
                    {group.projects.map((project) => (
                      <Typography.Text
                        key={project.id}
                        ellipsis={{ tooltip: project.name }}
                        style={{
                          display: "block",
                          cursor: "pointer",
                          fontWeight:
                            project.id === selectedClientProject?.id ? 600 : 400,
                          color:
                            project.id === selectedClientProject?.id
                              ? "#1677ff"
                              : undefined,
                        }}
                        onClick={() => onSelectProject(project.id)}
                      >
                        {project.name}
                      </Typography.Text>
                    ))}
                  </Space>
                ),
              }))}
              defaultActiveKey={groupedVisibleProjects.map((group) => group.status)}
            />
          )}
        </Space>
      </ProCard>
      <ProCard
        title={
          selectedClientProject ? (
            <AppLink
              href={`/projects/${selectedClientProject.id}`}
              style={{
                color: "inherit",
                display: "inline-block",
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {selectedClientProject.name}
            </AppLink>
          ) : (
            "项目排期"
          )
        }
        headerBordered
        style={{
          minWidth: 0,
          width: "calc(100% - 200px)",
          maxWidth: "calc(100% - 200px)",
          flex: "0 0 calc(100% - 200px)",
          overflow: "hidden",
        }}
        bodyStyle={{
          minWidth: 0,
          backgroundColor: "#F5F5F5",
          padding: "8px",
          overflowX: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            width: "100%",
            minWidth: 0,
            maxWidth: "100%",
            overflowX: "hidden",
          }}
        >
          {customerScheduleContent}
        </div>
      </ProCard>
    </ProCard>
  );
};

export default ClientProjectSchedulePane;
