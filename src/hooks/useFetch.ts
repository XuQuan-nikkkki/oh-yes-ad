import { useEffect, useState, useCallback } from "react";

interface UseFetchOptions {
  onError?: (error: Error) => void;
}

export function useFetch<T>(api: string, options?: UseFetchOptions) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(api);
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      const result = await res.json();
      setData(result);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      options?.onError?.(err);
    } finally {
      setLoading(false);
    }
  }, [api, options]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, refetch: fetchData };
}
