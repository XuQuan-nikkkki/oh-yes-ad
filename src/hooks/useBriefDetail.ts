"use client";

import { useCallback, useEffect, useState } from "react";

export function useBriefDetail<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    setNotFound(false);
    try {
      const response = await fetch(url, { cache: "no-store", signal });
      if (signal?.aborted) return;
      if (response.status === 404) {
        setData(null);
        setNotFound(true);
        return;
      }
      if (!response.ok) {
        throw new Error(response.status === 401 ? "登录已失效，请重新登录" : "加载详情失败，请重试");
      }
      const next: T = await response.json();
      if (!signal?.aborted) setData(next);
    } catch (cause) {
      if (!signal?.aborted) {
        setError(cause instanceof Error ? cause.message : "加载详情失败，请重试");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  return { data, loading, error, notFound, refresh };
}
