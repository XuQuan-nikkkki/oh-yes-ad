"use client";

import { PayCircleOutlined } from "@ant-design/icons";
import { Button, Card, Progress, Space, Typography } from "antd";
import BooleanTag from "@/components/BooleanTag";
import RemarkText from "@/components/RemarkText";
import SelectOptionTag from "@/components/SelectOptionTag";
import TableActions from "@/components/TableActions";
import type { ProjectReceivableNodeRow } from "@/components/project-detail/ProjectReceivableNodeTable";

const { Text } = Typography;

type StageOption = {
  id: string;
  value: string;
  color?: string | null;
};

type Props = {
  rows: ProjectReceivableNodeRow[];
  stageOptions: StageOption[];
  canManageProject: boolean;
  onCollectNode?: (row: ProjectReceivableNodeRow) => void;
  onEditNode?: (row: ProjectReceivableNodeRow) => void;
  onDeleteNode?: (row: ProjectReceivableNodeRow) => void;
};

const getActualAmountSum = (row: ProjectReceivableNodeRow) => {
  const actualNodes = (row as ProjectReceivableNodeRow & {
    actualNodes?: Array<{ actualAmountTaxIncluded?: number | null }>;
  }).actualNodes;

  if (Array.isArray(actualNodes) && actualNodes.length > 0) {
    return actualNodes.reduce((sum, item) => {
      const amount = Number(item.actualAmountTaxIncluded ?? 0);
      return Number.isFinite(amount) ? sum + amount : sum;
    }, 0);
  }

  const fallbackAmount = Number(
    (row as ProjectReceivableNodeRow & { actualAmountTaxIncluded?: number | null })
      .actualAmountTaxIncluded ?? 0,
  );
  return Number.isFinite(fallbackAmount) ? fallbackAmount : 0;
};

const ProjectReceivableNodeProList = ({
  rows,
  stageOptions,
  canManageProject,
  onCollectNode,
  onEditNode,
  onDeleteNode,
}: Props) => {
  return (
    <Card title="收款节点 ProList 对比" size="small">
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 1080 }}>
          {rows.map((row, index) => {
            const matched = stageOptions.find((item) => item.id === row.stageOptionId);

            return (
              <div
                key={row.id}
                style={{
                  width: "100%",
                  padding: "16px 0",
                  borderBottom: index === rows.length - 1 ? "none" : "1px solid #f0f0f0",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(220px, 1.2fr) repeat(4, minmax(140px, 1fr)) auto",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Space orientation="vertical" size={10} style={{ alignItems: "flex-start" }}>
                    <SelectOptionTag
                      option={
                        row.stageOption
                          ? {
                              id: row.stageOption.id,
                              value: row.stageOption.value,
                              color: row.stageOption.color ?? undefined,
                            }
                          : matched
                            ? {
                                id: matched.id,
                                value: matched.value,
                                color: matched.color ?? undefined,
                              }
                            : null
                      }
                    />
                    <Text strong>{row.keyDeliverable || "-"}</Text>
                  </Space>

                  <div>
                    <div style={{ color: "#6b7280", marginBottom: 6 }}>预收日期</div>
                    <Text>{row.expectedDate ? row.expectedDate.slice(0, 10) : "-"}</Text>
                  </div>

                  <div>
                    <div style={{ color: "#6b7280", marginBottom: 6 }}>收款进度</div>
                    {(() => {
                      const expectedAmount = Number(row.expectedAmountTaxIncluded ?? 0);
                      const actualAmountSum = getActualAmountSum(row);
                      const percent =
                        expectedAmount > 0
                          ? Math.max(
                              0,
                              Math.min(
                                100,
                                Math.round((actualAmountSum / expectedAmount) * 100),
                              ),
                            )
                          : 0;

                      return (
                        <Progress
                          percent={percent}
                          size="small"
                          format={() => `${actualAmountSum.toLocaleString("zh-CN")} / ${expectedAmount.toLocaleString("zh-CN")}`}
                        />
                      );
                    })()}
                  </div>

                  <div>
                    <div style={{ color: "#6b7280", marginBottom: 6 }}>有供应商付款</div>
                    <BooleanTag value={Boolean(row.hasVendorPayment)} />
                  </div>

                  <div>
                    <div style={{ color: "#6b7280", marginBottom: 6 }}>备注</div>
                    <RemarkText
                      remark={row.remark}
                      remarkNeedsAttention={row.remarkNeedsAttention}
                    />
                  </div>

                  <Space size={10} wrap={false} style={{ justifySelf: "end" }}>
                    <Button
                      variant="text"
                      color="primary"
                      style={{ paddingInline: 4 }}
                      disabled={!canManageProject}
                      icon={<PayCircleOutlined />}
                      onClick={() => onCollectNode?.(row)}
                    >
                      收款
                    </Button>
                    <TableActions
                      disabled={!canManageProject}
                      gap={0}
                      buttonStyle={{ paddingInline: 4 }}
                      onEdit={onEditNode ? () => onEditNode(row) : undefined}
                      onDelete={onDeleteNode ? () => onDeleteNode(row) : undefined}
                    />
                  </Space>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export default ProjectReceivableNodeProList;
