"use client";
import { useEffect, useRef, useState } from "react";
import { getStreamUrl } from "@/lib/api";
import type { Run, SSENewRun } from "@/lib/types";

export type StreamStatus = "connecting" | "live" | "offline";

export function useSSE(onNewRun: (run: Run) => void) {
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef(1000);

  useEffect(() => {
    let cancelled = false;

    function connect() {
      if (cancelled) return;
      const es = new EventSource(getStreamUrl());
      esRef.current = es;
      setStatus("connecting");

      es.onopen = () => { setStatus("live"); retryRef.current = 1000; };

      es.onmessage = (e) => {
        if (e.data === "connected" || e.data === "ping") return;
        try {
          const payload: SSENewRun = JSON.parse(e.data);
          if (payload.event === "new_run") onNewRun(payload.run);
        } catch {}
      };

      es.onerror = () => {
        setStatus("offline");
        es.close();
        if (!cancelled) {
          setTimeout(connect, retryRef.current);
          retryRef.current = Math.min(retryRef.current * 2, 30_000);
        }
      };
    }

    connect();
    return () => {
      cancelled = true;
      esRef.current?.close();
    };
  }, [onNewRun]);

  return status;
}
