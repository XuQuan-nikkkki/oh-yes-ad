"use client";

import { Suspense, useEffect } from "react";
import { Card } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import ProjectMilestonesView from "@/components/ProjectMilestonesView";

function ProjectMilestonesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const legacyTimelineLink = searchParams.get("view") === "timeline";

  useEffect(() => {
    if (legacyTimelineLink) {
      router.replace("/schedule?tab=project-milestones");
    }
  }, [legacyTimelineLink, router]);

  if (legacyTimelineLink) return null;
  return <ProjectMilestonesView view="table" />;
}

export default function Page() {
  return (
    <Suspense fallback={<Card loading />}>
      <ProjectMilestonesPageContent />
    </Suspense>
  );
}
