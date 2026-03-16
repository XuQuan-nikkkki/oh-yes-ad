"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WorkLogsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/?tab=work-logs");
  }, [router]);

  return null;
}
