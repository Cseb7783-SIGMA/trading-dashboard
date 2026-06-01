"""Pydantic models — Trading Dashboard API."""
from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field


class StrategyInfo(BaseModel):
    name: str
    version: str
    description: Optional[str] = None


class UniverseInfo(BaseModel):
    instrument: str
    timeframe: str
    type: str


class KPIsPeriod(BaseModel):
    """KPIs pour une fenêtre temporelle (1m/3m/6m/12m/all_time)."""
    pf: float | None = None
    wr: float | None = None
    trades: int = 0
    pnl: float = 0.0
    dd_pct: float = 0.0


class KPIsByPeriod(BaseModel):
    """KPIs par fenêtre — drift detection (scalping: 1d/1w/1m/3m, swing: 1m/3m/6m/12m)."""
    d1: KPIsPeriod | None = Field(None, alias="1d")
    w1: KPIsPeriod | None = Field(None, alias="1w")
    m1: KPIsPeriod | None = Field(None, alias="1m")
    m3: KPIsPeriod | None = Field(None, alias="3m")
    m6: KPIsPeriod | None = Field(None, alias="6m")
    m12: KPIsPeriod | None = Field(None, alias="12m")
    all_time: KPIsPeriod | None = None

    class Config:
        populate_by_name = True


class D033Eligibility(BaseModel):
    """Eligibility par destination — D-033 dimension 3 (calculé)."""
    paper: str = "no"           # yes / borderline / no
    personal_broker: str = "no"
    challenge_z: str = "no"
    propfirm: str = "no"


class D033(BaseModel):
    """Classification canonique D-033 (3 dimensions + style)."""
    tier_davey: str = "Archive"           # STATISTICALLY_ROBUST / HIGH / MEDIUM / LOW / Archive
    deployment_stage: str = "rd"          # rd / backtest_validated / paper / broker / propfirm / challenge_z
    style: str = "swing"                  # scalping / swing — détermine fenêtres KPIs affichées
    eligibility: D033Eligibility = D033Eligibility()
    schema_version: str = "1.0.0"
    computed_at: str = ""


class KPIs(BaseModel):
    profit_factor: float
    win_rate: float
    sharpe_ratio: float
    max_drawdown_pct: float
    total_trades: int
    winning_trades: int
    losing_trades: int
    total_pnl: float
    total_pnl_pct: float
    final_equity: float
    initial_capital: float
    composite_score: float
    prop_score: int  # /5
    max_consec_wins: int = 0
    max_consec_losses: int = 0
    challenge_z_score: int = 0  # /5 (S47 — Challenge Z TMAFX compat)
    sections: list[str] = []  # S47 dashboard sections : propfirm / challenge_z / construction / abandoned


class RunSummary(BaseModel):
    run_id: str
    created_at: str
    strategy: StrategyInfo
    universe: UniverseInfo
    tags: list[str]
    notes: Optional[str] = None
    kpis: KPIs
    d033: D033 = D033()
    kpis_by_period: dict = {}
    drift_status: str = "n/a"


class Trade(BaseModel):
    trade_id: int
    direction: str
    entry_dt: str
    entry_price: float
    exit_dt: str
    exit_price: float
    pnl_usd: float
    pnl_pct: float
    bars_held: int
    cumulative_pnl: float = 0.0  # computed


class RunDetail(RunSummary):
    trades: list[Trade]


class SSEEvent(BaseModel):
    event: str
    run_id: str
    summary: Optional[RunSummary] = None


class AIRequest(BaseModel):
    run_id: str
    prompt: str
    template: Optional[str] = None


class SuggestionSave(BaseModel):
    prompt: str
    response: str
    template: Optional[str] = None


class ActivateRequest(BaseModel):
    """Active une stratégie dans une destination (modifie meta.json d033.deployment_stage)."""
    destination: str  # "rd" | "paper" | "broker" | "propfirm" | "challenge_z"
