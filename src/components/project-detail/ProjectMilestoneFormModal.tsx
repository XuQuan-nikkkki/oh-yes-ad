"use client";

import { useEffect, type ComponentProps, type ReactNode } from "react";
import { Modal } from "antd";
import ProjectMilestoneForm from "@/components/project-detail/ProjectMilestoneForm";
import { useEmployeesStore } from "@/stores/employeesStore";

type ProjectMilestoneFormProps = ComponentProps<typeof ProjectMilestoneForm>;

type Props = ProjectMilestoneFormProps & {
  open: boolean;
  onCancel: () => void;
  title?: ReactNode;
  confirmLoading?: boolean;
};

const ProjectMilestoneFormModal = ({
  open,
  onCancel,
  title,
  confirmLoading,
  ...formProps
}: Props) => {
  const employees = useEmployeesStore((state) => state.employees);
  const employeesLoaded = useEmployeesStore((state) => state.loaded);
  const fetchEmployees = useEmployeesStore((state) => state.fetchEmployees);

  useEffect(() => {
    if (open && !employeesLoaded) {
      void fetchEmployees();
    }
  }, [employeesLoaded, fetchEmployees, open]);

  const allEmployees = Array.from(
    new Map(
      [...formProps.allEmployees, ...employees.map((employee) => ({
        id: employee.id,
        name: employee.name,
        function: employee.function,
        functionOption: employee.functionOption,
        employmentStatus:
          employee.employmentStatusOption?.value ?? employee.employmentStatus,
      }))].map((employee) => [employee.id, employee]),
    ).values(),
  );

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      footer={null}
      confirmLoading={confirmLoading}
      width={960}
      destroyOnHidden
    >
      <ProjectMilestoneForm {...formProps} allEmployees={allEmployees} />
    </Modal>
  );
};

export default ProjectMilestoneFormModal;
