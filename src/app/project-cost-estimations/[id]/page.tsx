"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "antd";
import { useParams } from "next/navigation";
import DetailPageContainer from "@/components/DetailPageContainer";
import ProjectCostEstimationCard from "@/components/project-detail/ProjectCostEstimationCard";
import ProjectPricingStrategyCard from "@/components/project-detail/ProjectPricingStrategyCard";
import { useProjectPermission } from "@/hooks/useProjectPermission";
import { useEmployeesStore } from "@/stores/employeesStore";
import type { Employee, Project } from "@/types/projectDetail";

const ProjectCostEstimationDetailPage = () => {
  const params = useParams();
  const projectId = params.id as string;
  const { canManageProject } = useProjectPermission();
  const fetchEmployeesFromStore = useEmployeesStore((state) => state.fetchEmployees);

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [projectRes, employeeRows] = await Promise.all([
        fetch(`/api/projects/${projectId}`, { cache: "no-store" }),
        fetchEmployeesFromStore(),
      ]);
      const projectData = projectRes.ok
        ? ((await projectRes.json()) as Project)
        : null;

      setProject(projectData);
      setEmployees(Array.isArray(employeeRows) ? (employeeRows as Employee[]) : []);
    } finally {
      setLoading(false);
    }
  }, [fetchEmployeesFromStore, projectId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (!project) {
    return (
      <DetailPageContainer>
        <Card loading={loading}>{loading ? null : "项目不存在"}</Card>
      </DetailPageContainer>
    );
  }

  return (
    <DetailPageContainer>
      <ProjectCostEstimationCard
        projectId={project.id}
        projectName={project.name ?? ""}
        canManageProject={canManageProject}
        latestCostEstimation={project.latestCostEstimation}
        employees={employees}
        showProjectInBasicInfo
        onSaved={(latestCostEstimation) => {
          setProject((prev) =>
            prev
              ? {
                  ...prev,
                  latestCostEstimation,
                }
            : prev,
          );
        }}
      />
      <ProjectPricingStrategyCard
        projectId={project.id}
        projectName={project.name ?? ""}
        latestCostEstimation={project.latestCostEstimation}
      />
    </DetailPageContainer>
  );
};

export default ProjectCostEstimationDetailPage;
