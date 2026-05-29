"use client";
import { useCallback, useEffect, useState } from "react";
import { fetchRuns } from "@/lib/api";
import type { Run } from "@/lib/types";
import { useSSE } from "./useSSE";

export function useRuns() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchRuns()
      .then(setRuns)
      .finally(() => setLoading(false));
  }, []);

  const onNewRun = useCallback((run: Run) => {
    setRuns((prev) => {
      const exists = prev.find((r) => r.run_id === run.run_id);
      if (exists) return prev;
      const next = [run, ...prev].sort(
        (a, b) => b.kpis.composite_score - a.kpis.composite_score
      );
      return next;
    });
    setToast(`Nouveau run : ${run.strategy.name} · ${run.universe.instrument}`);
    setTimeout(() => setToast(null), 5000);
  }, []);

  const streamStatus = useSSE(onNewRun);

  return { runs, loading, streamStatus, toast };
}
