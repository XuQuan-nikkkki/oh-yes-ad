import type {
  ProjectBrief,
  ProjectBriefDeliverable,
} from "@/components/project-detail/ProjectBriefProgressContent";

export type BriefDetail = ProjectBrief & {
  updatedAt: string;
  project: {
    id: string;
    name: string;
    client?: { id: string; name: string } | null;
  };
};

export type DeliverableDetail = ProjectBriefDeliverable & {
  createdAt: string;
  updatedAt: string;
  creator: { id: string; name: string };
  brief: Pick<BriefDetail, "id" | "title" | "project">;
};
