"use client";

import { useMemo, useRef } from "react";
import { Button, Form, InputNumber, Popconfirm, Select, Space, Table, Typography } from "antd";
import type { Employee } from "@/types/projectDetail";
import SelectOptionTag from "@/components/SelectOptionTag";

export type EstimationMemberFormRow = {
  id: string;
  employeeId?: string;
  allocationPercent?: number;
};

type Props = {
  employees: Employee[];
  memberDraftRows: EstimationMemberFormRow[];
  setMemberDraftRows: React.Dispatch<React.SetStateAction<EstimationMemberFormRow[]>>;
  editingMemberRowIndex: number | null;
  setEditingMemberRowIndex: React.Dispatch<React.SetStateAction<number | null>>;
  onRemoveSuccess?: () => void;
};

const MEMBER_TABLE_MAX_HEIGHT = 300;
const MEMBER_FUNCTION_GROUP_ORDER = [
  "项目组",
  "设计组",
  "品牌组",
  "新媒体",
  "财务组",
] as const;

const isEmployeeActive = (employee: Employee) =>
  employee.employmentStatus !== "离职" &&
  employee.employmentStatusOption?.value !== "离职";

const ProjectEstimationMembersFormList = ({
  employees,
  memberDraftRows,
  setMemberDraftRows,
  editingMemberRowIndex,
  setEditingMemberRowIndex,
  onRemoveSuccess,
}: Props) => {
  const memberTableContainerRef = useRef<HTMLDivElement | null>(null);

  const activeEmployees = useMemo(
    () => employees.filter((employee) => isEmployeeActive(employee)),
    [employees],
  );

  const employeeById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees],
  );

  return (
    <Form.List name="members">
      {(fields, { add, remove }, { errors }) => (
        <Space orientation="vertical" style={{ width: "100%" }} size={12}>
          <div
            ref={memberTableContainerRef}
            style={{
              width: "100%",
              maxHeight: MEMBER_TABLE_MAX_HEIGHT,
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            <Table
              rowKey="key"
              pagination={false}
              dataSource={fields}
              locale={{ emptyText: "暂无成员，请添加" }}
              style={{ width: "100%" }}
              tableLayout="fixed"
              scroll={{
                x: "max-content",
                y: MEMBER_TABLE_MAX_HEIGHT - 50,
              }}
              columns={[
                {
                  title: "序号",
                  key: "index",
                  width: 64,
                  align: "center",
                  render: (_value, _field, index) => index + 1,
                },
                {
                  title: "姓名",
                  key: "employeeId",
                  width: 280,
                  render: (_value, field) => (
                    <Form.Item
                      name={[field.name, "employeeId"]}
                      style={{ marginBottom: 0 }}
                      rules={[{ required: true, message: "请选择成员" }]}
                    >
                      <Select
                        options={(() => {
                          const selectedIds = new Set(
                            memberDraftRows
                              .map((row) => row.employeeId)
                              .filter(
                                (id): id is string =>
                                  typeof id === "string" && id.length > 0,
                              ),
                          );
                          const currentEmployeeId =
                            memberDraftRows[field.name]?.employeeId;
                          if (currentEmployeeId) {
                            selectedIds.delete(currentEmployeeId);
                          }

                          const grouped = new Map<
                            string,
                            Array<{ label: string; value: string }>
                          >();
                          for (const employee of activeEmployees) {
                            if (selectedIds.has(employee.id)) continue;
                            const groupLabel =
                              employee.functionOption?.value?.trim() ||
                              employee.function?.trim() ||
                              "未设置职能";
                            if (!grouped.has(groupLabel)) {
                              grouped.set(groupLabel, []);
                            }
                            grouped.get(groupLabel)?.push({
                              label: employee.name,
                              value: employee.id,
                            });
                          }

                          return Array.from(grouped.entries())
                            .sort((a, b) => {
                              const leftIndex = MEMBER_FUNCTION_GROUP_ORDER.indexOf(
                                a[0] as (typeof MEMBER_FUNCTION_GROUP_ORDER)[number],
                              );
                              const rightIndex = MEMBER_FUNCTION_GROUP_ORDER.indexOf(
                                b[0] as (typeof MEMBER_FUNCTION_GROUP_ORDER)[number],
                              );
                              const leftPriority =
                                leftIndex === -1
                                  ? MEMBER_FUNCTION_GROUP_ORDER.length
                                  : leftIndex;
                              const rightPriority =
                                rightIndex === -1
                                  ? MEMBER_FUNCTION_GROUP_ORDER.length
                                  : rightIndex;

                              if (leftPriority !== rightPriority) {
                                return leftPriority - rightPriority;
                              }

                              return a[0].localeCompare(b[0], "zh-CN");
                            })
                            .map(([label, options]) => ({
                              label,
                              options: options.sort((a, b) =>
                                a.label.localeCompare(b.label, "zh-CN"),
                              ),
                            }));
                        })()}
                        showSearch
                        placeholder="请选择成员"
                        optionFilterProp="label"
                        disabled={editingMemberRowIndex !== field.name}
                        onChange={(value) => {
                          setMemberDraftRows((previous) => {
                            const next = [...previous];
                            const idx = field.name;
                            next[idx] = {
                              ...(next[idx] ?? {
                                id: `${Date.now()}-${idx}`,
                              }),
                              employeeId: String(value),
                            };
                            return next;
                          });
                        }}
                      />
                    </Form.Item>
                  ),
                },
                {
                  title: "职能",
                  key: "function",
                  width: 180,
                  render: (_value, field) => {
                    const row = memberDraftRows[field.name];
                    const employee = row?.employeeId
                      ? employeeById.get(row.employeeId)
                      : undefined;
                    if (!employee?.functionOption?.value) return "-";
                    return <SelectOptionTag option={employee.functionOption} />;
                  },
                },
                {
                  title: "占比",
                  key: "allocationPercent",
                  width: 220,
                  render: (_value, field) => (
                    <Form.Item
                      name={[field.name, "allocationPercent"]}
                      style={{ marginBottom: 0 }}
                      rules={[
                        { required: true, message: "请输入占比" },
                        {
                          validator: async (_, value: unknown) => {
                            if (typeof value !== "number" || value <= 0) {
                              return Promise.reject(new Error("占比需大于 0"));
                            }
                            return Promise.resolve();
                          },
                        },
                      ]}
                    >
                      <InputNumber
                        min={1}
                        max={100}
                        precision={0}
                        style={{ width: "100%" }}
                        placeholder="占比（%）"
                        disabled={editingMemberRowIndex !== field.name}
                      />
                    </Form.Item>
                  ),
                },
                {
                  title: "操作",
                  key: "actions",
                  width: 120,
                  render: (_value, field) => (
                    <Space size={8} wrap={false}>
                      <Button
                        type="link"
                        onClick={() => setEditingMemberRowIndex(field.name)}
                      >
                        编辑
                      </Button>
                      <Popconfirm
                        title="确定移除该成员吗？"
                        okText="移除"
                        cancelText="取消"
                        onConfirm={() => {
                          remove(field.name);
                          setMemberDraftRows((prev) =>
                            prev.filter((_row, index) => index !== field.name),
                          );
                          if (editingMemberRowIndex === field.name) {
                            setEditingMemberRowIndex(null);
                          }
                          onRemoveSuccess?.();
                        }}
                      >
                        <Button danger type="link">
                          移除
                        </Button>
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
            />
          </div>
          <Typography.Text type="secondary">{`已添加 ${fields.length} 个人员`}</Typography.Text>
          <Form.ErrorList errors={errors} />
          <Button
            type="dashed"
            block
            style={{ height: 44 }}
            onClick={() => {
              const nextId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
              const nextIndex = fields.length;
              add({ id: nextId });
              setMemberDraftRows((prev) => [...prev, { id: nextId }]);
              setEditingMemberRowIndex(nextIndex);
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  const container = memberTableContainerRef.current;
                  if (!container) return;
                  const tableBody = container.querySelector(
                    ".ant-table-body",
                  ) as HTMLDivElement | null;
                  if (tableBody) {
                    tableBody.scrollTo({
                      top: tableBody.scrollHeight,
                      behavior: "smooth",
                    });
                    return;
                  }
                  container.scrollTo({
                    top: container.scrollHeight,
                    behavior: "smooth",
                  });
                });
              });
            }}
          >
            + 添加一个成员
          </Button>
        </Space>
      )}
    </Form.List>
  );
};

export default ProjectEstimationMembersFormList;
