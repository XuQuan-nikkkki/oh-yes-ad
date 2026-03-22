"use client";

import ActualWorkEntriesTable, {
  type ActualWorkEntryRow,
} from "@/components/ActualWorkEntriesTable";

type Props = {
  projectId: string;
  requestData: (params: {
    current: number;
    pageSize: number;
    filters: {
      title?: string;
      employeeName?: string;
      projectName?: string;
      startDate?: string;
      startDateFrom?: string;
      startDateTo?: string;
    };
  }) => Promise<{ data: ActualWorkEntryRow[]; total: number }>;
  employeeFilterOptions: { label: string; value: string }[];
  refreshKey: number;
  onEdit: (row: ActualWorkEntryRow) => void;
  onAfterDelete?: () => Promise<void> | void;
};

const ProjectActualWorkRecordsContent = ({
  projectId,
  requestData,
  employeeFilterOptions,
  refreshKey,
  onEdit,
  onAfterDelete,
}: Props) => {
  return (
    <ActualWorkEntriesTable
      headerTitle={null}
      showTableOptions={false}
      compactHorizontalPadding
      employeeFilterOptions={employeeFilterOptions}
      refreshKey={refreshKey}
      columnKeys={["title", "employeeName", "startDate", "workDay", "actions"]}
      requestData={requestData}
      onEdit={onEdit}
      onDelete={async (id) => {
        await fetch(`/api/projects/${projectId}/actual-work-entries/${id}`, {
          method: "DELETE",
        });
        await onAfterDelete?.();
      }}
    />
  );
};

export default ProjectActualWorkRecordsContent;
