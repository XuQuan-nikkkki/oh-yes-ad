import TableActions from "@/components/TableActions";
import type { EmployeeColumnContext, EmployeeColumnMap } from "./columnTypes";

export const createActionColumn = ({
  isPositionView,
  actionsDisabled,
  actionDeleteText,
  actionDeleteTitle,
  onEdit,
  onDelete,
}: EmployeeColumnContext): EmployeeColumnMap => ({
  actions: {
    key: "actions",
    title: "操作",
    fixed: isPositionView ? "right" : undefined,
    width: 132,
    hideInSetting: true,
    render: (_dom, record) => (
      <TableActions
        onEdit={onEdit ? () => onEdit(record) : undefined}
        onDelete={onDelete ? () => onDelete(record.id) : undefined}
        disabled={actionsDisabled}
        deleteTitle={actionDeleteTitle}
        deleteText={actionDeleteText}
      />
    ),
  },
});
