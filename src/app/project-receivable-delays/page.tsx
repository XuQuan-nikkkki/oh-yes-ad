"use client";

import { useEffect } from "react";
import { Card } from "antd";
import ListPageContainer from "@/components/ListPageContainer";
import PageAccessResult from "@/components/PageAccessResult";
import { useAuthStore } from "@/stores/authStore";

export default function ProjectReceivableDelaysPage() {
  const authLoaded = useAuthStore((state) => state.loaded);
  const fetchMe = useAuthStore((state) => state.fetchMe);

  useEffect(() => {
    if (!authLoaded) {
      void fetchMe();
    }
  }, [authLoaded, fetchMe]);

  return (
    <ListPageContainer>
      <Card title="项目收款延期">
        <PageAccessResult type="developing" />
      </Card>
    </ListPageContainer>
  );
}
