// @ts-nocheck
"use client";

import { useMemo } from "react";
import { Button, Checkbox, message } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";
import TableActions from "@/components/TableActions";
import SelectOptionTag from "@/components/SelectOptionTag";

type SelectOptionValue = {
  id: string;
  value: string;
  color?: string | null;
};

export type ProjectDocumentRow = {
  id: string;
  name: string;
  typeOption?: SelectOptionValue | null;
  date?: string | null;
  isFinal: boolean;
  internalLink?: string | null;
  project?: { id: string; name: string } | null;
  milestone?: { id: string; name: string } | null;
};

type Props = {
  rows: ProjectDocumentRow[];
  onEdit?: (row: ProjectDocumentRow) => void;
  onDelete: (id: string) => void;
  actionDeleteText?: string;
  actionDeleteTitle?: string;
  columnKeys?: Array<
    | "name"
    | "project"
    | "type"
    | "milestone"
    | "date"
    | "isFinal"
    | "internalLink"
    | "actions"
  >;
  headerTitle?: React.ReactNode;
  toolbarActions?: React.ReactNode[];
  showColumnSetting?: boolean;
};

const ProjectDocumentsTable = ({
  rows,
  onEdit,
  onDelete,
  actionDeleteText = "删除",
  actionDeleteTitle,
  columnKeys = [
    "name",
    "project",
    "type",
    "milestone",
    "date",
    "isFinal",
    "internalLink",
    "actions",
  ],
  headerTitle = <h3 style={{ margin: 0 }}>项目资料</h3>,
  toolbarActions = [],
  showColumnSetting = true,
}: Props) => {
  const [messageApi, contextHolder] = message.useMessage();
  const formatDateSafe = (value?: string | null) => {
    if (!value) return "";
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "";
  };
  const resolveLinkText = (value: unknown): string => {
    if (typeof value === "string") return value.trim();
    if (!value || typeof value !== "object") return "";

    const candidate = value as Record<string, unknown>;
    const tryGet = (...keys: string[]) => {
      for (const key of keys) {
        const next = candidate[key];
        if (typeof next === "string" && next.trim()) {
          return next.trim();
        }
      }
      return "";
    };

    const direct = tryGet("url", "href", "value", "text", "name", "link");
    if (direct) return direct;

    const nestedText = candidate.text;
    if (nestedText && typeof nestedText === "object") {
      const nested = nestedText as Record<string, unknown>;
      const nestedValue =
        (typeof nested.content === "string" && nested.content.trim()) ||
        (typeof nested.value === "string" && nested.value.trim()) ||
        (typeof nested.text === "string" && nested.text.trim()) ||
        "";
      if (nestedValue) return nestedValue;
    }
    return "";
  };

  const nameFilters = useMemo(
    () =>
      Array.from(
        new Set(rows.map((row) => row.name).filter((value): value is string => Boolean(value))),
      ).map((value) => ({ text: value, value })),
    [rows],
  );

  const projectFilters = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((row) => row.project?.name)
            .filter((value): value is string => Boolean(value)),
        ),
      ).map((value) => ({ text: value, value })),
    [rows],
  );

  const typeFilters = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((row) => row.typeOption?.value)
            .filter((value): value is string => Boolean(value)),
        ),
      ).map((value) => ({ text: value, value })),
    [rows],
  );
  const milestoneFilters = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((row) => row.milestone?.name)
            .filter((value): value is string => Boolean(value)),
        ),
      ).map((value) => ({ text: value, value })),
    [rows],
  );
  const dateFilters = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((row) => formatDateSafe(row.date))
            .filter((value): value is string => Boolean(value)),
        ),
      ).map((value) => ({ text: value, value })),
    [rows],
  );
  const finalFilters = useMemo(
    () => [
      { text: "是", value: "true" },
      { text: "否", value: "false" },
    ],
    [],
  );

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      messageApi.success("链接已复制");
    } catch {
      messageApi.error("复制失败");
    }
  };

  const allColumns: Record<
    NonNullable<Props["columnKeys"]>[number],
    ProColumns<ProjectDocumentRow>
  > = {
    name: {
      title: "名称",
      dataIndex: "name",
      width: 200,
      ellipsis: true,
      onCell: () => ({ style: { maxWidth: 200 } }),
      filters: nameFilters,
      filterSearch: true,
      onFilter: (value, record) => (record.name ?? "") === String(value),
      render: (_, record) => (
        <AppLink href={`/project-documents/${record.id}`}>{record.name}</AppLink>
      ),
    },
    project: {
      title: "所属项目",
      key: "projectName",
      width: 200,
      ellipsis: true,
      onCell: () => ({ style: { maxWidth: 200 } }),
      filters: projectFilters,
      filterSearch: true,
      onFilter: (value, record) => (record.project?.name ?? "") === String(value),
      render: (_, record) =>
        record.project ? (
          <AppLink href={`/projects/${record.project.id}`}>{record.project.name}</AppLink>
        ) : (
          "-"
        ),
    },
    type: {
      title: "类型",
      dataIndex: "typeOption",
      filters: typeFilters,
      filterSearch: true,
      onFilter: (value, record) => (record.typeOption?.value ?? "") === String(value),
      render: (option: SelectOptionValue | null | undefined) => (
        <SelectOptionTag option={option ?? null} />
      ),
    },
    milestone: {
      title: "关联里程碑",
      key: "milestoneName",
      filters: milestoneFilters,
      filterSearch: true,
      onFilter: (value, record) => (record.milestone?.name ?? "") === String(value),
      render: (_, record) =>
        record.milestone ? (
          <AppLink href={`/project-milestones/${record.milestone.id}`}>
            {record.milestone.name}
          </AppLink>
        ) : (
          "-"
        ),
    },
    date: {
      title: "日期",
      dataIndex: "date",
      filters: dateFilters,
      filterSearch: true,
      onFilter: (value, record) =>
        formatDateSafe(record.date) === String(value),
      render: (value: string | null | undefined) =>
        formatDateSafe(value),
    },
    isFinal: {
      title: "是最终版",
      dataIndex: "isFinal",
      filters: finalFilters,
      onFilter: (value, record) => String(record.isFinal) === String(value),
      render: (value: boolean) => (
        <Checkbox checked={value} onChange={() => {}} style={{ pointerEvents: "none" }} />
      ),
    },
    internalLink: {
      title: "内部链接",
      dataIndex: "internalLink",
      width: 200,
      ellipsis: true,
      onCell: () => ({ style: { maxWidth: 200 } }),
      render: (_value: unknown, record) => {
        const text = resolveLinkText(record.internalLink);
        const hasValue = Boolean(text) && text !== "-";
        if (!hasValue) return "-";

        const isHttpLink = /^https?:\/\//i.test(text);
        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              minWidth: 0,
            }}
          >
            {isHttpLink ? (
              <a
                href={text}
                target="_blank"
                rel="noopener noreferrer"
                title={text}
                style={{
                  display: "block",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: "gray",
                  textDecoration: "underline",
                }}
              >
                {text}
              </a>
            ) : (
              <span
                title={text}
                style={{
                  display: "block",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {text}
              </span>
            )}
            {!isHttpLink && <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => void copyLink(text)}
              style={{ flexShrink: 0 }}
            />}
          </div>
        );
      },
    },
    actions: {
      title: "操作",
      key: "actions",
      valueType: "option",
      render: (_, record) => [
        <TableActions
          key={record.id}
          onEdit={onEdit ? () => onEdit(record) : undefined}
          onDelete={() => onDelete(record.id)}
          deleteTitle={actionDeleteTitle ?? `确定删除资料「${record.name}」？`}
          deleteText={actionDeleteText}
        />,
      ],
    },
  };
  const columns: ProColumns<ProjectDocumentRow>[] = columnKeys.map(
    (key) => allColumns[key],
  );

  return (
    <>
      {contextHolder}
      <ProTable<ProjectDocumentRow>
        rowKey="id"
        columns={columns}
        dataSource={rows}
        search={false}
        headerTitle={headerTitle}
        pagination={{ pageSize: 10 }}
        tableLayout="auto"
        scroll={{ x: "max-content" }}
        toolBarRender={() => toolbarActions}
        options={{
          reload: false,
          density: false,
          fullScreen: false,
          setting: showColumnSetting
            ? {
                draggable: false,
              }
            : false,
        }}
        locale={{ emptyText: "暂无项目资料" }}
      />
    </>
  );
};

export default ProjectDocumentsTable;
