"use client";

import { Button, Modal, Select, Space } from "antd";
import type { ProjectMilestoneRow } from "@/components/ProjectMilestonesTable";
import type { ProjectSegmentRow } from "@/components/project-detail/ProjectSegmentsTable";
import type { ProjectTaskRow } from "@/components/project-detail/ProjectTasksTable";
import type { ProjectMilestoneFormPayload } from "@/components/project-detail/ProjectMilestoneForm";
import ProjectMilestoneFormModal from "@/components/project-detail/ProjectMilestoneFormModal";
import type { ProjectSegmentFormPayload } from "@/components/project-detail/ProjectSegmentForm";
import ProjectSegmentFormModal from "@/components/project-detail/ProjectSegmentFormModal";
import type { ProjectTaskFormPayload } from "@/components/project-detail/ProjectTaskForm";
import ProjectTaskFormModal from "@/components/project-detail/ProjectTaskFormModal";
import ProjectDocumentForm, {
  type ProjectDocumentFormPayload,
} from "@/components/project-detail/ProjectDocumentForm";
import ActualWorkEntryForm, {
  type ActualWorkEntryFormPayload,
} from "@/components/project-detail/ActualWorkEntryForm";
import PlannedWorkEntryForm, {
  type PlannedWorkEntryFormPayload,
} from "@/components/project-detail/PlannedWorkEntryForm";
import MilestoneNoticeTemplate from "@/components/project-detail/MilestoneNoticeTemplate";
import type {
  ClientContact,
  Employee,
  PlannedWorkRow,
  Project,
} from "@/types/projectDetail";

type ActualWorkView = "records" | "analysis";

type EditingDocument = {
  id: string;
  name: string;
  typeOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  date?: string | null;
  isFinal: boolean;
  internalLink?: string | null;
} | null;

type EditingActualWorkEntry = {
  id: string;
  title: string;
  employeeId: string;
  startDate: string;
  endDate: string;
} | null;

type MilestoneActionProps = {
  projectId: string;
  visible: boolean;
  canManageProject: boolean;
  project: Project | null;
  employees: Employee[];
  clientContacts: ClientContact[];
  open: boolean;
  editing: ProjectMilestoneRow | null;
  onOpenCreate: () => void;
  onCancel: () => void;
  onSaved: () => Promise<void>;
};

export const ProjectMilestoneAction = ({
  projectId,
  visible,
  canManageProject,
  project,
  employees,
  clientContacts,
  open,
  editing,
  onOpenCreate,
  onCancel,
  onSaved,
}: MilestoneActionProps) => (
  <>
    {visible ? (
      <Space size={8}>
        <MilestoneNoticeTemplate
          status={project?.status}
          statusOptionValue={project?.statusOption?.value}
          milestones={project?.milestones ?? []}
        />
        <Button
          type="primary"
          disabled={!canManageProject}
          onClick={() => {
            if (!canManageProject) return;
            onOpenCreate();
          }}
        >
          新增里程碑
        </Button>
      </Space>
    ) : null}
    <ProjectMilestoneFormModal
      title={editing ? "编辑里程碑" : "新增里程碑"}
      open={open}
      onCancel={onCancel}
      initialValues={editing}
      projectMembers={project?.members ?? []}
      allEmployees={employees}
      clientParticipants={project?.client?.id ? clientContacts : []}
      vendors={project?.vendors ?? []}
      projectOptions={project ? [{ id: project.id, name: project.name }] : []}
      selectedProjectId={project?.id}
      disableProjectSelect
      onSubmit={async (payload: ProjectMilestoneFormPayload) => {
        if (!canManageProject) return;
        if (editing) {
          await fetch(`/api/projects/${projectId}/milestones/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else {
          await fetch(`/api/projects/${projectId}/milestones`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }
        onCancel();
        await onSaved();
      }}
    />
  </>
);

type SegmentActionProps = {
  projectId: string;
  visible: boolean;
  canManageProject: boolean;
  open: boolean;
  editing: ProjectSegmentRow | null;
  employees: Employee[];
  onOpenCreate: () => void;
  onCancel: () => void;
  onSaved: () => Promise<void>;
};

export const ProjectSegmentAction = ({
  projectId,
  visible,
  canManageProject,
  open,
  editing,
  employees,
  onOpenCreate,
  onCancel,
  onSaved,
}: SegmentActionProps) => (
  <>
    {visible ? (
      <Button
        type="primary"
        disabled={!canManageProject}
        onClick={() => {
          if (!canManageProject) return;
          onOpenCreate();
        }}
      >
        新增环节
      </Button>
    ) : null}
    <ProjectSegmentFormModal
      title={editing ? "编辑环节" : "新增环节"}
      open={open}
      onCancel={onCancel}
      initialValues={editing}
      employees={employees}
      onSubmit={async (payload: ProjectSegmentFormPayload) => {
        if (!canManageProject) return;
        if (editing) {
          await fetch(`/api/projects/${projectId}/segments/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else {
          await fetch(`/api/projects/${projectId}/segments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }
        onCancel();
        await onSaved();
      }}
    />
  </>
);

type DocumentActionProps = {
  projectId: string;
  visible: boolean;
  open: boolean;
  editing: EditingDocument;
  onOpenCreate: () => void;
  onCancel: () => void;
  onSaved: () => Promise<void>;
};

export const ProjectDocumentAction = ({
  projectId,
  visible,
  open,
  editing,
  onOpenCreate,
  onCancel,
  onSaved,
}: DocumentActionProps) => (
  <>
    {visible ? (
      <Button
        type="primary"
        onClick={() => {
          onOpenCreate();
        }}
      >
        新增文档
      </Button>
    ) : null}
    <Modal
      title={editing ? "编辑文档" : "新增文档"}
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
    >
      <ProjectDocumentForm
        initialValues={editing}
        onSubmit={async (payload: ProjectDocumentFormPayload) => {
          if (editing) {
            await fetch(`/api/projects/${projectId}/documents/${editing.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
          } else {
            await fetch(`/api/projects/${projectId}/documents`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
          }
          onCancel();
          await onSaved();
        }}
      />
    </Modal>
  </>
);

type ActualWorkActionProps = {
  projectId: string;
  visible: boolean;
  actualWorkView: ActualWorkView;
  onActualWorkViewChange: (value: ActualWorkView) => void;
  project: Project | null;
  employees: Employee[];
  open: boolean;
  editing: EditingActualWorkEntry;
  onOpenCreate: () => void;
  onCancel: () => void;
  onSaved: () => Promise<void>;
};

export const ProjectActualWorkAction = ({
  projectId,
  visible,
  actualWorkView,
  onActualWorkViewChange,
  project,
  employees,
  open,
  editing,
  onOpenCreate,
  onCancel,
  onSaved,
}: ActualWorkActionProps) => (
  <>
    {visible ? (
      <Space size={8}>
        <Select
          value={actualWorkView}
          style={{ width: 140 }}
          options={[
            { label: "工时记录", value: "records" },
            { label: "工时分析", value: "analysis" },
          ]}
          onChange={(value) => onActualWorkViewChange(value as ActualWorkView)}
        />
        <Button type="primary" onClick={onOpenCreate}>
          新增实际工时
        </Button>
      </Space>
    ) : null}
    <Modal
      title={editing ? "编辑实际工时" : "新增实际工时"}
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
    >
      <ActualWorkEntryForm
        projectOptions={
          project
            ? [
                {
                  id: project.id,
                  name: project.name,
                },
              ]
            : []
        }
        selectedProjectId={project?.id}
        disableProjectSelect
        employees={employees}
        initialValues={
          editing
            ? {
                ...editing,
                projectId: project?.id ?? "",
              }
            : null
        }
        onSubmit={async (payload: ActualWorkEntryFormPayload) => {
          if (editing) {
            await fetch(
              `/api/projects/${projectId}/actual-work-entries/${editing.id}`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              },
            );
          } else {
            await fetch(`/api/projects/${projectId}/actual-work-entries`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
          }
          onCancel();
          await onSaved();
        }}
      />
    </Modal>
  </>
);

type TaskModalProps = {
  projectId: string;
  canManageProject: boolean;
  open: boolean;
  editing: ProjectTaskRow | null;
  segmentRows: ProjectSegmentRow[];
  defaultSegmentId?: string;
  employees: Employee[];
  onCancel: () => void;
  onCreate: (payload: ProjectTaskFormPayload) => Promise<void>;
  onSaved: () => Promise<void>;
};

export const ProjectTaskModal = ({
  projectId,
  canManageProject,
  open,
  editing,
  segmentRows,
  defaultSegmentId,
  employees,
  onCancel,
  onCreate,
  onSaved,
}: TaskModalProps) => (
  <ProjectTaskFormModal
    title={editing ? "编辑任务" : "新增任务"}
    open={open}
    onCancel={onCancel}
    segmentOptions={segmentRows.map((segment) => ({
      id: segment.id,
      name: segment.name,
    }))}
    defaultSegmentId={defaultSegmentId}
    employees={employees}
    initialValues={editing}
    onSubmit={async (payload) => {
      if (editing) {
        if (!canManageProject) return;
        await fetch(`/api/projects/${projectId}/tasks/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await onCreate(payload);
      }
      onCancel();
      await onSaved();
    }}
  />
);

type PlannedWorkModalProps = {
  projectId: string;
  open: boolean;
  project: Project | null;
  editing: PlannedWorkRow | null;
  defaultTaskId?: string;
  onCancel: () => void;
  onCreate: (payload: PlannedWorkEntryFormPayload) => Promise<void>;
  onSaved: () => Promise<void>;
};

export const ProjectPlannedWorkModal = ({
  projectId,
  open,
  project,
  editing,
  defaultTaskId,
  onCancel,
  onCreate,
  onSaved,
}: PlannedWorkModalProps) => (
  <Modal
    title={editing ? "编辑计划工时" : "新增计划工时"}
    open={open}
    onCancel={onCancel}
    footer={null}
    destroyOnHidden
  >
    <PlannedWorkEntryForm
      projectOptions={
        project
          ? [
              {
                id: project.id,
                name: project.name,
              },
            ]
          : []
      }
      selectedProjectId={project?.id}
      disableProjectSelect
      taskOptions={
        project?.segments?.flatMap((segment) =>
          (segment.projectTasks ?? []).map((task) => ({
            id: task.id,
            projectId: project.id,
            segmentId: segment.id,
            segmentName: segment.name,
            name: task.name,
          })),
        ) ?? []
      }
      initialValues={
        editing
          ? {
              id: editing.id,
              taskId: editing.taskId,
              yearOption:
                typeof editing.year === "number"
                  ? String(editing.year)
                  : String(new Date().getFullYear()),
              weekNumberOption:
                typeof editing.weekNumber === "number"
                  ? String(editing.weekNumber)
                  : "1",
              year: editing.year ?? new Date().getFullYear(),
              weekNumber: editing.weekNumber ?? 1,
              plannedDays: editing.plannedDays ?? 0,
              monday: Boolean(editing.monday),
              tuesday: Boolean(editing.tuesday),
              wednesday: Boolean(editing.wednesday),
              thursday: Boolean(editing.thursday),
              friday: Boolean(editing.friday),
              saturday: Boolean(editing.saturday),
              sunday: Boolean(editing.sunday),
            }
          : defaultTaskId
            ? {
                id: "new",
                taskId: defaultTaskId,
                yearOption: String(new Date().getFullYear()),
                weekNumberOption: "1",
                year: new Date().getFullYear(),
                weekNumber: 1,
                plannedDays: 0,
                monday: false,
                tuesday: false,
                wednesday: false,
                thursday: false,
                friday: false,
                saturday: false,
                sunday: false,
              }
            : null
      }
      onSubmit={async (payload: PlannedWorkEntryFormPayload) => {
        if (editing) {
          await fetch(`/api/projects/${projectId}/planned-work-entries/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else {
          await onCreate(payload);
        }
        onCancel();
        await onSaved();
      }}
    />
  </Modal>
);
