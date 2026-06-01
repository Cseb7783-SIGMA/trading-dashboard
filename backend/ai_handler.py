"""Appel Anthropic API en streaming avec contexte run injecté automatiquement."""
from __future__ import annotations

import os
from pathlib import Path
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass

from typing import AsyncIterator

from models import AIRequest, RunSummary

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

SYSTEM_PROMPT = """Tu es analyste quant senior spécialisé backtests algo + prop firms (FTMO, TMAFX Challenge Z).

Mission : évaluer si une stratégie mérite Paper Trade / Broker / Challenge. Sois direct, froid, protège le capital.

Pour chaque analyse, vérifie :
1. Sample size (≥ 50 trades minimum, 100+ idéal)
2. Profit factor (≥ 1.5 robuste, ≥ 1.2 marginal)
3. Max DD (< 10% ✓, > 15% ✗)
4. Win rate cohérent avec PF
5. Risques cachés (overfit, biais survivor, régime-spécifique)

Décision : AVANCER / OPTIMISER / REJETER avec justification chiffrée.
Format réponse : Verdict, Métriques clés, Risques, Action concrète.

GÉNÉRATION CODE — Si l'utilisateur demande explicitement un Pine Script V6, génère le code complet et compilable. Format Pine V6 : //@version=6, strategy(), indicator() selon contexte. Inclure : entrées/sorties, SL/TP, gestion position size, alertconditions. Pas de blabla, juste le code prêt à coller dans TradingView."""


def _build_context(run: RunSummary) -> str:
    k = run.kpis
    return f"""
Contexte du run analysé :
- Stratégie : {run.strategy.name} v{run.strategy.version}
- Univers : {run.universe.instrument} · {run.universe.timeframe} · {run.universe.type}
- Tags : {', '.join(run.tags)}
- Notes : {run.notes or 'aucune'}

KPIs :
- Profit Factor : {k.profit_factor}
- Win Rate : {k.win_rate:.1f}%
- Sharpe Ratio : {k.sharpe_ratio:.3f}
- Max Drawdown : {k.max_drawdown_pct:.2f}%
- Total Trades : {k.total_trades} ({k.winning_trades} gagnants / {k.losing_trades} perdants)
- PnL total : {k.total_pnl:.2f}$ ({k.total_pnl_pct:.2f}%)
- Equity finale : {k.final_equity:.2f}$ (départ : {k.initial_capital:.2f}$)
- Score composite : {k.composite_score}/100
- Prop Score : {k.prop_score}/5
""".strip()


async def stream_ai_response(request: AIRequest, run: RunSummary | None) -> AsyncIterator[str]:
    if not ANTHROPIC_API_KEY:
        yield "data: [Clé ANTHROPIC_API_KEY non configurée dans .env]\n\n"
        return

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        if run is not None:
            context = _build_context(run)
            user_message = f"{context}\n\nQuestion : {request.prompt}"
        else:
            user_message = f"[Contexte général — pas de stratégie spécifique]\n\nQuestion : {request.prompt}"

        import json as _json
        with client.messages.stream(
            model=model_to_use,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        ) as stream:
            for text in stream.text_stream:
                yield f"data: {_json.dumps({'text': text})}\n\n"
        yield "data: [DONE]\n\n"

    except Exception as e:
        yield f"data: [Erreur : {e}]\n\n"
