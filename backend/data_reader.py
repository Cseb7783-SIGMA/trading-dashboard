"""Lecture du filesystem results/runs/ — stateless, aucune DB.

PATCH 2026-05-16 (Sebast + Claude strategic) :
- Sample size multiplier (anti-overfitting petit échantillon)
- Prop score : seuil trades relevé à 50 (D-025 alignment)
- Confidence level visible (low/medium/high/robust)
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Optional

import pandas as pd

from models import KPIs, RunDetail, RunSummary, StrategyInfo, Trade, UniverseInfo

RUNS_DIR = Path(os.getenv("RUNS_DIR", "../results/runs"))


# ── Sample size multiplier (NEW S46) ─────────────────────────────────────────

def _sample_multiplier(trades: int) -> float:
    """Pénalité multiplicative selon taille échantillon.

    < 20  trades = 0.30 (anecdotique, non significatif)
    < 50  trades = 0.60 (insuffisant pour validation)
    < 100 trades = 0.80 (acceptable mais marginal)
    >= 100 trades = 1.00 (sample robuste)
    """
    if trades < 20:
        return 0.30
    if trades < 50:
        return 0.60
    if trades < 100:
        return 0.80
    return 1.00


def _confidence_level(trades: int) -> str:
    """Niveau de confiance statistique pour affichage UI."""
    if trades < 20:
        return "anecdotique"
    if trades < 50:
        return "faible"
    if trades < 100:
        return "moyenne"
    if trades < 200:
        return "élevée"
    return "robuste"


# ── Scores ──────────────────────────────────────────────────────────────────

def _composite_score(kpis_raw: dict) -> float:
    pf = kpis_raw["ratios"]["profit_factor"]
    wr = kpis_raw["ratios"]["win_rate"]
    sharpe = kpis_raw["ratios"]["sharpe_ratio"]
    dd = kpis_raw["drawdown"]["max_drawdown_pct"]
    trades = kpis_raw["trade_counts"]["total"]

    pf_score = min(max((pf - 1.0) / 1.5 * 100, 0), 100)
    wr_score = min(max(wr, 0), 100)
    sharpe_score = min(max(sharpe / 2.0 * 100, 0), 100)
    dd_score = min(max(100 + dd * 3, 0), 100)

    # Base score (sans bonus naïf)
    base = (pf_score * 3 + wr_score + sharpe_score + dd_score * 2) / 7

    # PATCH : multiplier sample size — pénalise overfitting petit échantillon
    multiplier = _sample_multiplier(trades)
    composite = base * multiplier

    return round(min(composite, 100), 1)


def _prop_score(kpis_raw: dict) -> int:
    pf = kpis_raw["ratios"]["profit_factor"]
    dd = abs(kpis_raw["drawdown"]["max_drawdown_pct"])
    pnl_pct = kpis_raw["pnl"]["total_pnl_pct"]
    trades = kpis_raw["trade_counts"]["total"]

    score = 0
    if dd < 5:
        score += 1    # daily DD proxy
    if dd < 10:
        score += 1    # total DD < 10%
    if pnl_pct >= 8:
        score += 1    # profit target
    if trades >= 50:    # PATCH : 25 → 50 (D-025 alignment, sample suffisant)
        score += 1
    if pf >= 1.2:
        score += 1    # PF floor
    return score


# ── Parsers ──────────────────────────────────────────────────────────────────

def _parse_kpis(meta: dict, kpis_raw: dict) -> KPIs:
    trades = kpis_raw["trade_counts"]["total"]
    return KPIs(
        profit_factor=round(kpis_raw["ratios"]["profit_factor"], 3),
        win_rate=round(kpis_raw["ratios"]["win_rate"], 2),
        sharpe_ratio=round(kpis_raw["ratios"]["sharpe_ratio"], 3),
        max_drawdown_pct=round(kpis_raw["drawdown"]["max_drawdown_pct"], 2),
        total_trades=trades,
        winning_trades=kpis_raw["trade_counts"]["winning"],
        losing_trades=kpis_raw["trade_counts"]["losing"],
        total_pnl=round(kpis_raw["pnl"]["total_pnl"], 2),
        total_pnl_pct=round(kpis_raw["pnl"]["total_pnl_pct"], 2),
        final_equity=round(kpis_raw["account"]["final_equity"], 2),
        initial_capital=round(kpis_raw["account"]["initial_capital"], 2),
        composite_score=_composite_score(kpis_raw),
        prop_score=_prop_score(kpis_raw),
        max_consec_wins=kpis_raw.get("trade_counts", {}).get("max_consec_wins", 0),
        max_consec_losses=kpis_raw.get("trade_counts", {}).get("max_consec_losses", 0),
        challenge_z_score=_challenge_z_score(kpis_raw),
        sections=_sections(kpis_raw),
    )


def _sections(kpis_raw: dict) -> list[str]:
    """Détermine les sections dashboard d'un run (S47).

    Sections :
      - propfirm     : éligible FTMO 100k$ (étape 6 roadmap)
      - challenge_z  : compatible TMAFX (étape 7 roadmap)
      - construction : en cours, ni PropFirm ni Z mais pas réfuté
      - abandoned    : réfuté empirique (PF < 1, ou MaxDD > 30 %, ou sample trop faible)

    Une stratégie peut être dans PLUSIEURS sections actives (propfirm + challenge_z).
    'abandoned' est mutuellement exclusif avec les autres.
    """
    pf = kpis_raw.get("ratios", {}).get("profit_factor", 0)
    dd_abs = abs(kpis_raw.get("drawdown", {}).get("max_drawdown_pct", 0))
    trades = kpis_raw.get("trade_counts", {}).get("total", 0)
    prop = _prop_score(kpis_raw)
    z = _challenge_z_score(kpis_raw)

    # Abandonnée : critères de rejet strict (mutuellement exclusif)
    if pf < 1.0 or dd_abs > 30 or (trades < 20 and pf < 1.5):
        return ["abandoned"]

    sections = []
    if prop >= 4 and trades >= 100 and dd_abs <= 10:
        sections.append("propfirm")
    if z >= 3 and trades >= 50:
        sections.append("challenge_z")
    if not sections:
        sections = ["construction"]
    return sections


def _challenge_z_score(kpis_raw: dict) -> int:
    """Score Challenge Z 0-5 — D-028 critères S47."""
    score = 0
    wr = kpis_raw.get("ratios", {}).get("win_rate", 0)
    if wr >= 60: score += 1
    rr = kpis_raw.get("ratios", {}).get("avg_win_loss_ratio", 0)
    if rr >= 1.5: score += 1
    cl = kpis_raw.get("trade_counts", {}).get("max_consec_losses", 99)
    if cl <= 3: score += 1
    cw = kpis_raw.get("trade_counts", {}).get("max_consec_wins", 0)
    if cw >= 5: score += 1
    trades = kpis_raw.get("trade_counts", {}).get("total", 0)
    if trades >= 100: score += 1
    return score


def _parse_trades(trades_csv: Path) -> list[Trade]:
    if not trades_csv.exists():
        return []
    df = pd.read_csv(trades_csv)
    cumulative = 0.0
    trades = []
    for _, row in df.iterrows():
        cumulative += float(row.get("pnl_usd", 0))
        trades.append(Trade(
            trade_id=int(row["trade_id"]),
            direction=str(row["direction"]),
            entry_dt=str(row["entry_dt"]),
            entry_price=float(row["entry_price"]),
            exit_dt=str(row["exit_dt"]),
            exit_price=float(row["exit_price"]),
            pnl_usd=round(float(row["pnl_usd"]), 2),
            pnl_pct=round(float(row["pnl_pct"]), 4),
            bars_held=int(float(row.get("bars_held", 0))) if pd.notna(row.get("bars_held")) and row.get("bars_held") != "" else 0,
            cumulative_pnl=round(cumulative, 2),
        ))
    return trades


def _parse_run(run_dir: Path) -> Optional[RunSummary]:
    meta_path = run_dir / "meta.json"
    kpis_path = run_dir / "kpis.json"
    if not meta_path.exists() or not kpis_path.exists():
        return None
    try:
        meta = json.loads(meta_path.read_text())
        kpis_raw = json.loads(kpis_path.read_text())
        return RunSummary(
            run_id=meta["run_id"],
            created_at=meta.get("created_at", ""),
            strategy=StrategyInfo(
                name=meta["strategy"]["name"],
                version=meta["strategy"].get("version", ""),
                description=meta["strategy"].get("description"),
            ),
            universe=UniverseInfo(
                instrument=meta["universe"].get("instrument", "?"),
                timeframe=meta["universe"].get("timeframe", "?"),
                type=meta["universe"].get("type", "?"),
            ),
            tags=meta.get("tags", []),
            notes=meta.get("notes"),
            kpis=_parse_kpis(meta, kpis_raw),
        )
    except Exception:
        return None


# ── Public API ───────────────────────────────────────────────────────────────

def read_all_runs() -> list[RunSummary]:
    if not RUNS_DIR.exists():
        return []
    runs = []
    for run_dir in sorted(RUNS_DIR.iterdir(), reverse=True):
        if run_dir.is_dir():
            run = _parse_run(run_dir)
            if run:
                runs.append(run)
    runs.sort(key=lambda r: r.kpis.composite_score, reverse=True)
    return runs


def read_run_detail(run_id: str) -> Optional[RunDetail]:
    run_dir = RUNS_DIR / run_id
    summary = _parse_run(run_dir)
    if not summary:
        return None
    trades = _parse_trades(run_dir / "trades.csv")
    return RunDetail(**summary.model_dump(), trades=trades)


def get_runs_dir() -> Path:
    return RUNS_DIR
