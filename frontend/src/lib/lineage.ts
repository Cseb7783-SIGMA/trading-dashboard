/**
 * Lineage utilities — group strategies by family (algo concept).
 *
 * A "family" = same algorithm concept (e.g., "Fabio V3 POC Reversion").
 * Within a family, runs can vary by:
 *   - sub-strategy (V1 fidele, V2 short_only, V3 skip_lunch)
 *   - asset (QQQ, SPY, NQ, ES)
 *   - timeframe (5m, 15m, 2m)
 *
 * The parser uses curated prefix patterns to extract the family from strategy.name.
 * For unknown patterns, falls back to the strategy.name itself (single-family).
 *
 * S61 — Lineage View
 */
import type { Run } from "./types";

export type LineageFamily = {
  family_id: string;       // unique key for grouping, e.g., "fabio_v3"
  family_label: string;    // human-readable, e.g., "Fabio V3 — POC Reversion"
  family_icon: string;     // Tabler icon name, e.g., "chart-candle"
  family_description?: string;
};

export type LineageVersion = {
  version_id: string;      // e.g., "fidele", "poc_short_only", "skip_lunch", "dalton", "V1"
  version_label: string;   // display label, e.g., "V1 fidele"
  version_description?: string; // short description (from strategy.description or notes)
};

export type LineageRun = {
  run: Run;
  family: LineageFamily;
  version: LineageVersion;
  asset: string;           // e.g., "QQQ"
  tf: string;              // e.g., "5m"
  asset_label: string;     // e.g., "ETF Nasdaq 100" or "Futures S&P 500"
  category: AssetCategory;
};

export type AssetCategory =
  | "stocks" | "etf" | "futures" | "cfd" | "indices"
  | "forex" | "crypto" | "commodities" | "unknown";

// Asset → category mapping
const ASSET_CATEGORY: Record<string, { category: AssetCategory; label: string }> = {
  QQQ: { category: "etf", label: "ETF Nasdaq 100" },
  SPY: { category: "etf", label: "ETF S&P 500" },
  IWM: { category: "etf", label: "ETF Russell 2000" },
  DIA: { category: "etf", label: "ETF Dow Jones" },
  TLT: { category: "etf", label: "ETF Treasury 20Y" },
  GLD: { category: "etf", label: "ETF Gold" },
  USO: { category: "etf", label: "ETF Oil" },
  ES: { category: "futures", label: "Futures S&P 500" },
  NQ: { category: "futures", label: "Futures Nasdaq 100" },
  YM: { category: "futures", label: "Futures Dow Jones" },
  RTY: { category: "futures", label: "Futures Russell 2000" },
  MNQ: { category: "futures", label: "Micro Futures Nasdaq" },
  MES: { category: "futures", label: "Micro Futures S&P 500" },
  CL: { category: "commodities", label: "Crude Oil futures" },
  GC: { category: "commodities", label: "Gold futures" },
  SI: { category: "commodities", label: "Silver futures" },
  US100: { category: "cfd", label: "CFD Nasdaq 100 (Skilling)" },
  US500: { category: "cfd", label: "CFD S&P 500 (Skilling)" },
  US30: { category: "cfd", label: "CFD Dow Jones (Skilling)" },
  GER40: { category: "cfd", label: "CFD DAX (Skilling)" },
  NDX: { category: "indices", label: "Nasdaq 100 cash index" },
  SPX: { category: "indices", label: "S&P 500 cash index" },
  DJI: { category: "indices", label: "Dow Jones cash index" },
  EURUSD: { category: "forex", label: "EUR/USD" },
  GBPUSD: { category: "forex", label: "GBP/USD" },
  USDJPY: { category: "forex", label: "USD/JPY" },
  BTC: { category: "crypto", label: "Bitcoin" },
  BTCUSD: { category: "crypto", label: "Bitcoin/USD" },
  ETH: { category: "crypto", label: "Ethereum" },
};

// Family patterns — ordered, first match wins. Most specific first.
const FAMILY_PATTERNS: Array<{
  test: (name: string) => boolean;
  family_id: string;
  family_label: string;
  family_icon: string;
  family_description?: string;
  // Extract sub-strategy label from run (strategy.name + version)
  extractVersion: (name: string, version: string, instrument: string) => LineageVersion;
}> = [
  // Fabio V4 Dalton (1 sub-strategy "Dalton", varies by asset)
  {
    test: (n) => n.startsWith("fabio_v4_dalton"),
    family_id: "fabio_v4_dalton",
    family_label: "Fabio V4 Dalton",
    family_icon: "chart-candle",
    family_description: "RTH + Multi-TF + IB + Confluence",
    extractVersion: () => ({ version_id: "dalton", version_label: "V1 Dalton" }),
  },
  // Fabio V3 (multiple sub-strategies)
  {
    test: (n) => n.startsWith("fabio_v3"),
    family_id: "fabio_v3",
    family_label: "Fabio V3 — POC Reversion",
    family_icon: "chart-candle",
    family_description: "Volume Profile + POC reversion + auction theory",
    extractVersion: (name, _v, instrument) => {
      // fabio_v3_fidele_spy_5min → "fidele"
      // fabio_v3_poc_short_only_spy_5min → "poc_short_only"
      // fabio_v3_poc_short_skip_lunch_spy_5min → "poc_short_skip_lunch"
      let sub = name.replace(/^fabio_v3_/, "");
      const instrLower = instrument.toLowerCase();
      const idx = sub.indexOf(`_${instrLower}`);
      if (idx > 0) sub = sub.substring(0, idx);
      // Determine version number based on sub
      const versionOrder: Record<string, string> = {
        fidele: "V1",
        poc_short_only: "V2",
        poc_short_skip_lunch: "V3",
      };
      const vNum = versionOrder[sub] || "V1";
      return { version_id: sub || "v1", version_label: `${vNum} ${sub || "fidele"}` };
    },
  },
  // Fabio V2 Value Area
  {
    test: (n) => n.startsWith("fabio_v2"),
    family_id: "fabio_v2",
    family_label: "Fabio V2 — Value Area Bounces",
    family_icon: "chart-candle",
    family_description: "VAH/VAL bounces + POC reversion + single prints fill",
    extractVersion: () => ({ version_id: "value_area", version_label: "V1 value_area" }),
  },
  // Range Filter
  {
    test: (n) => n.startsWith("range_filter"),
    family_id: "range_filter",
    family_label: "Range Filter — DonovanWall",
    family_icon: "chart-line",
    family_description: "Adaptive range filter Buy/Sell (Pine v5 → Python)",
    extractVersion: (name, _v, instrument) => {
      let sub = name.replace(/^range_filter_/, "");
      const instrLower = instrument.toLowerCase();
      const idx = sub.indexOf(`_${instrLower}`);
      if (idx > 0) sub = sub.substring(0, idx);
      const versionOrder: Record<string, string> = {
        ema200: "V1",
        only: "V2",
      };
      const vNum = versionOrder[sub] || "V1";
      return { version_id: sub, version_label: `${vNum} ${sub === "ema200" ? "+ EMA200" : sub === "only" ? "pur (sans EMA)" : sub}` };
    },
  },
  // EMA Crossover
  {
    test: (n) => n.startsWith("ema_crossover"),
    family_id: "ema_crossover",
    family_label: "EMA Crossover — Test alerts",
    family_icon: "test-pipe",
    family_description: "EMA 5/20 crossover + EMA50 trend filter",
    extractVersion: (_n, version) => ({ version_id: version || "v1", version_label: "V1 EMA crossover" }),
  },
  // F1 family (V1, V1.A, V1.B, V1.C, V1.D, V1.E)
  {
    test: (n) => /^f1_v1/.test(n),
    family_id: "f1_v1",
    family_label: "F1 — Liquidity Sweep + IFVG",
    family_icon: "chart-arrows",
    family_description: "Liquidity sweep + IFVG + EMA + Two-Sting (walk-forward validated)",
    extractVersion: (name) => {
      // f1_v1e_qqq_range → V1.E
      const match = name.match(/^f1_v1([a-z]?)/);
      const letter = match?.[1]?.toUpperCase() || "";
      const versionLabel = letter ? `V1.${letter}` : "V1";
      // Get suffix after f1_v1{letter}_
      const suffix = name.replace(/^f1_v1[a-z]?_/, "").split("_").slice(0, -2).join(" ");
      return { version_id: `v1${letter.toLowerCase()}`, version_label: `${versionLabel}${suffix ? " " + suffix : ""}` };
    },
  },
  // F10 V1A AVWAP
  {
    test: (n) => n.startsWith("f10_v1a"),
    family_id: "f10_v1a",
    family_label: "F10 — F1 × AVWAP × RR3",
    family_icon: "chart-line",
    family_description: "F1 V1A combo Anchored VWAP RR3 (combo grid search)",
    extractVersion: () => ({ version_id: "v1a", version_label: "V1.A AVWAP × RR3" }),
  },
  // BB RSI Dual-TF Divergence
  {
    test: (n) => n.startsWith("bb_rsi_dual_tf"),
    family_id: "bb_rsi_dual_tf",
    family_label: "BB RSI Dual-TF Divergence",
    family_icon: "chart-line",
    family_description: "Bollinger Bands + RSI divergence dual timeframe",
    extractVersion: (_n, version) => ({ version_id: version || "v7", version_label: `${version || "V7"} divergence` }),
  },
  // BB RSI Mean Reversion
  {
    test: (n) => n.startsWith("bb_rsi_mean_reversion"),
    family_id: "bb_rsi_mr",
    family_label: "BB RSI Mean Reversion",
    family_icon: "chart-line",
    family_description: "Bollinger mean reversion + RSI confirmation",
    extractVersion: (_n, version) => ({ version_id: version || "v6", version_label: `${version || "V6"} mean_reversion` }),
  },
  // EMA Cross simple (legacy)
  {
    test: (n) => n.startsWith("ema_cross_"),
    family_id: "ema_cross_simple",
    family_label: "EMA Cross — Simple",
    family_icon: "chart-line",
    family_description: "Simple EMA crossover (legacy)",
    extractVersion: (_n, version) => ({ version_id: version || "v1", version_label: `${version || "V1"}` }),
  },
  // V8/V9 Confluence
  {
    test: (n) => /^v[89](_|$)/.test(n) || n.startsWith("V8 Confluence") || n.startsWith("confluence_volume"),
    family_id: "confluence_volume",
    family_label: "V8/V9 Confluence Volume & Order Flow",
    family_icon: "chart-bar",
    family_description: "Multi-confluence volume + order flow",
    extractVersion: (_n, version) => ({ version_id: version || "vX", version_label: version || "V8.x" }),
  },
  // Agent variants
  {
    test: (n) => n.startsWith("agent_v"),
    family_id: "agent_variants",
    family_label: "Agent LLM Variants",
    family_icon: "robot",
    family_description: "Stratégies composées par l'agent LLM",
    extractVersion: (_n, version) => ({ version_id: version || "v1", version_label: version || "V1" }),
  },
];

/**
 * Extract lineage info for a single run.
 */
export function parseLineage(run: Run): LineageRun {
  const name = (run.strategy?.name || "").toLowerCase();
  const version = run.strategy?.version || "v1";
  const instrument = (run.universe?.instrument || "").toUpperCase();
  const tf = run.universe?.timeframe || "?";

  // Find matching family
  const match = FAMILY_PATTERNS.find((p) => p.test(name));
  const family: LineageFamily = match
    ? {
        family_id: match.family_id,
        family_label: match.family_label,
        family_icon: match.family_icon,
        family_description: match.family_description,
      }
    : {
        family_id: name,
        family_label: run.strategy?.name || "Unknown",
        family_icon: "chart-bar",
      };

  const versionInfo = match
    ? match.extractVersion(name, version, instrument)
    : { version_id: version, version_label: version };

  versionInfo.version_description = run.strategy?.description?.slice(0, 100);

  const assetMeta = ASSET_CATEGORY[instrument] || { category: "unknown" as AssetCategory, label: instrument };

  return {
    run,
    family,
    version: versionInfo,
    asset: instrument,
    tf,
    asset_label: assetMeta.label,
    category: assetMeta.category,
  };
}

/**
 * Group runs by family → version → assets.
 *
 * Returns a tree structure:
 *   Family
 *     └─ Version
 *         └─ Assets (one row per run)
 */
export type LineageTree = Array<{
  family: LineageFamily;
  versions: Array<{
    version: LineageVersion;
    runs: LineageRun[];
  }>;
  total_runs: number;
  any_paper: boolean;
  best_run_id?: string;  // run_id with highest PF
}>;

export function groupByLineage(runs: Run[]): LineageTree {
  const byFamily = new Map<string, Map<string, LineageRun[]>>();

  for (const run of runs) {
    const lr = parseLineage(run);
    const fId = lr.family.family_id;
    const vId = lr.version.version_id;
    if (!byFamily.has(fId)) byFamily.set(fId, new Map());
    const versionsMap = byFamily.get(fId)!;
    if (!versionsMap.has(vId)) versionsMap.set(vId, []);
    versionsMap.get(vId)!.push(lr);
  }

  const tree: LineageTree = [];
  for (const [, versionsMap] of byFamily) {
    const firstLR = Array.from(versionsMap.values())[0][0];
    const family = firstLR.family;

    const versions = Array.from(versionsMap.values()).map((runs) => ({
      version: runs[0].version,
      runs: runs.sort((a, b) => (b.run.kpis.profit_factor || 0) - (a.run.kpis.profit_factor || 0)),
    }));
    versions.sort((a, b) => (a.version.version_id || "").localeCompare(b.version.version_id || ""));

    const all_runs = versions.flatMap((v) => v.runs);
    const any_paper = all_runs.some((r) => r.run.d033?.deployment_stage === "paper");
    const best = all_runs.reduce((acc, cur) =>
      (cur.run.kpis.profit_factor || 0) > (acc?.run.kpis.profit_factor || 0) ? cur : acc,
      all_runs[0]
    );

    tree.push({
      family,
      versions,
      total_runs: all_runs.length,
      any_paper,
      best_run_id: best?.run.run_id,
    });
  }

  // Sort families: paper-active FIRST, then by best PF descending
  tree.sort((a, b) => {
    // Paper-active families always before non-paper
    if (a.any_paper !== b.any_paper) return a.any_paper ? -1 : 1;
    // Within same paper status, sort by best PF descending
    const aPF = Math.max(...a.versions.flatMap((v) => v.runs.map((r) => r.run.kpis.profit_factor || 0)));
    const bPF = Math.max(...b.versions.flatMap((v) => v.runs.map((r) => r.run.kpis.profit_factor || 0)));
    return bPF - aPF;
  });

  return tree;
}

// Helper : count by various dimensions for sidebar filters
export function countByTier(tree: LineageTree): Record<string, number> {
  const counts: Record<string, number> = {
    ALL: 0,
    STATISTICALLY_ROBUST: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    Archive: 0,
  };
  for (const fam of tree) {
    for (const v of fam.versions) {
      for (const r of v.runs) {
        counts.ALL++;
        const t = r.run.d033?.tier_davey || "Archive";
        if (t in counts) counts[t]++;
        else counts.Archive++;
      }
    }
  }
  return counts;
}

export function countByStyle(tree: LineageTree): { scalping: number; swing: number; all: number } {
  let scalping = 0, swing = 0, all = 0;
  for (const fam of tree) {
    for (const v of fam.versions) {
      for (const r of v.runs) {
        all++;
        if (r.run.d033?.style === "scalping") scalping++;
        else if (r.run.d033?.style === "swing") swing++;
      }
    }
  }
  return { scalping, swing, all };
}

export function countByStage(tree: LineageTree): { paper: number; rd: number; all: number } {
  let paper = 0, rd = 0, all = 0;
  for (const fam of tree) {
    for (const v of fam.versions) {
      for (const r of v.runs) {
        all++;
        if (r.run.d033?.deployment_stage === "paper") paper++;
        else rd++;
      }
    }
  }
  return { paper, rd, all };
}

export function countByCategory(tree: LineageTree): Record<AssetCategory, number> {
  const counts: Record<AssetCategory, number> = {
    stocks: 0, etf: 0, futures: 0, cfd: 0, indices: 0,
    forex: 0, crypto: 0, commodities: 0, unknown: 0,
  };
  for (const fam of tree) {
    for (const v of fam.versions) {
      for (const r of v.runs) {
        counts[r.category]++;
      }
    }
  }
  return counts;
}
