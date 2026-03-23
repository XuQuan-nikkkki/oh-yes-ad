"use client";

import type { ReactNode } from "react";
import { Collapse, Space, Tag, Typography } from "antd";
import AppLink from "@/components/AppLink";
import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";

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
  status?: string | null;
  statusOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
} | null;

type Props = {
  visibleProjectCount: number;
  groupedVisibleProjects: GroupedVisibleProject[];
  selectedClientProject: SelectedProjectView;
  customerScheduleContent: ReactNode;
  statusActionsDisabled?: boolean;
  onProjectStatusUpdated?: () => Promise<void> | void;
  onSelectProject: (projectId: string) => void;
};

const ClientProjectSchedulePane = ({
  visibleProjectCount,
  groupedVisibleProjects,
  selectedClientProject,
  customerScheduleContent,
  statusActionsDisabled = false,
  onProjectStatusUpdated,
  onSelectProject,
}: Props) => {
  return (
    <div
      style={{
        width: "100%",
        minWidth: 0,
        display: "flex",
        border: "1px solid #f0f0f0",
        borderRadius: 8,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <div
        style={{
          minHeight: 520,
          flex: "0 0 200px",
          minWidth: 200,
          maxWidth: 200,
          borderInlineEnd: "1px solid #f0f0f0",
          padding: 16,
          boxSizing: "border-box",
        }}
      >
        <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
          项目列表
        </Typography.Title>
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
                    <Tag color={group.statusOption?.color ?? "default"}>
                      {group.statusOption?.value ?? group.status}
                    </Tag>
                    <Typography.Text type="secondary">
                      （{group.projects.length}）
                    </Typography.Text>
                  </Space>
                ),
                style: {
                  marginBottom: 8,
                },
                children: (
                  <Space
                    orientation="vertical"
                    size={6}
                    style={{ width: "100%" }}
                  >
                    {group.projects.map((project) => (
                      <Typography.Text
                        key={project.id}
                        ellipsis={{ tooltip: project.name }}
                        style={{
                          display: "block",
                          cursor: "pointer",
                          fontWeight:
                            project.id === selectedClientProject?.id
                              ? 600
                              : 400,
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
              defaultActiveKey={groupedVisibleProjects.map(
                (group) => group.status,
              )}
            />
          )}
        </Space>
      </div>
      <div
        style={{
          minWidth: 0,
          width: "auto",
          maxWidth: "100%",
          flex: "1 1 0",
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #f0f0f0",
            minWidth: 0,
            background: "#fff",
          }}
        >
          {selectedClientProject ? (
            <Space size={8} wrap style={{ maxWidth: "100%" }}>
              <AppLink
                href={`/projects/${selectedClientProject.id}`}
                style={{
                  color: "inherit",
                  display: "inline-block",
                  maxWidth: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontWeight: 600,
                }}
              >
                {selectedClientProject.name}
              </AppLink>
              <SelectOptionQuickEditTag
                field="project.status"
                option={
                  selectedClientProject.statusOption?.value
                    ? {
                        id: selectedClientProject.statusOption.id ?? "",
                        value: selectedClientProject.statusOption.value,
                        color: selectedClientProject.statusOption.color ?? null,
                      }
                    : selectedClientProject.status
                      ? { value: selectedClientProject.status, color: null }
                      : null
                }
                disabled={statusActionsDisabled}
                fallbackText="未设置状态"
                modalTitle="修改项目状态"
                modalDescription="勾选只会暂存状态切换。点击保存后会一并保存选项改动、排序和项目状态。"
                emptyText="暂无项目状态"
                saveSuccessText="项目状态已保存"
                optionValueLabel="状态值"
                onSaveSelection={async (selectedOption) => {
                  const response = await fetch(
                    `/api/projects/${selectedClientProject.id}`,
                    {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        status: {
                          value: selectedOption.value,
                          color: selectedOption.color,
                        },
                      }),
                    },
                  );

                  if (!response.ok) {
                    throw new Error(
                      (await response.text()) || "更新项目状态失败",
                    );
                  }
                }}
                onUpdated={onProjectStatusUpdated}
              />
            </Space>
          ) : (
            <Typography.Text strong>项目排期</Typography.Text>
          )}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            width: "100%",
            minWidth: 0,
            maxWidth: "100%",
            overflowX: "auto",
            backgroundColor: "#F5F5F5",
            padding: "8px",
            boxSizing: "border-box",
          }}
        >
          {customerScheduleContent}
        </div>
      </div>
    </div>
  );
};

export default ClientProjectSchedulePane;
