"use client";

import { useCallback, useRef, useState } from "react";

type SubmitTask<T> = () => T | Promise<T>;

export const useSubmitLock = () => {
  const [submitting, setSubmitting] = useState(false);
  const lockRef = useRef(false);

  const runWithSubmitLock = useCallback(async <T,>(task: SubmitTask<T>) => {
    if (lockRef.current) {
      return undefined;
    }

    lockRef.current = true;
    setSubmitting(true);

    try {
      return await task();
    } finally {
      lockRef.current = false;
      setSubmitting(false);
    }
  }, []);

  return {
    submitting,
    runWithSubmitLock,
  };
};
