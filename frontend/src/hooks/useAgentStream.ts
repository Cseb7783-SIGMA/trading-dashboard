"use client";
import { useEffect, useState } from "react";

const PLATFORM_BASE = process.env.NEXT_PUBLIC_PLATFORM_BASE || "http://localhost:8002";

export type AgentStreamData = {
  equity: number;
  cash: number;
  positions: number;
  cycle: number;
  live: boolean;
  last_updated: number;
};

export type AgentFullState = {
  config: {
    initial_capital: number;
    assets: string[];
    interval_seconds: number;
    started_at?: number;
  };
  portfolio: {
    initial_capital: number;
    cash: number;
    positions: unknown[];
    closed_trades: unknown[];
    equity_curve: unknown[];
  };
  status: "running" | "stopped";
  pid?: number;
  cycle_count: number;
  total_agent_cost_usd: number;
  live: boolean;
};

type State = {
  full: AgentFullState | null;
  stream: AgentStreamData | null;
  connected: boolean;
  error: string | null;
};

/**
 * useAgentStream — fetch initial state + SSE stream for an agent
 * @param agentName "paper-trader" | "propfirm-trader" | "challenge-z-trader"
 */
export function useAgentStream(agentName: string): State {
  const [full, setFull] = useState<AgentFullState | null>(null);
  const [stream, setStream] = useState<AgentStreamData | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Initial fetch (full state)
  useEffect(() => {
    let alive = true;
    fetch(`${PLATFORM_BASE}/${agentName}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (alive) setFull(data);
      })
      .catch((e) => {
        if (alive) setError(`Initial fetch failed: ${e.message}`);
      });
    return () => { alive = false; };
  }, [agentName]);

  // 2. SSE stream for live updates
  useEffect(() => {
    const es = new EventSource(`${PLATFORM_BASE}/${agentName}/stream`);

    es.onopen = () => {
      setConnected(true);
      setError(null);
    };

    es.onmessage = (event) => {
      if (event.data === "connected") return;
      try {
        const data: AgentStreamData = JSON.parse(event.data);
        setStream(data);
      } catch {
        // Ignore parse errors on heartbeats
      }
    };

    es.onerror = () => {
      setConnected(false);
      setError("Stream disconnected");
    };

    return () => {
      es.close();
    };
  }, [agentName]);

  return { full, stream, connected, error };
}
