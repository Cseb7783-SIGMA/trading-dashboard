"""FastAPI — Trading Lab Dashboard API.

Routes :
  GET  /health          → statut + config
  GET  /runs            → liste tous les runs (triés composite)
  GET  /runs/{run_id}   → détail run + trades
  GET  /stream          → SSE nouveaux runs (watchdog)
  POST /ai              → SSE réponse Claude en streaming

Démarrage :
  uvicorn main:app --host 0.0.0.0 --port 8000
"""
from __future__ import annotations

import asyncio
import json
import os
import socket
import importlib
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from ai_handler import stream_ai_response
from data_reader import get_runs_dir, read_all_runs, read_run_detail
from file_watcher import start_observer
from models import AIRequest, SuggestionSave, ActivateRequest

# ── SSE queue ─────────────────────────────────────────────────────────────
sse_queue: asyncio.Queue[str] = asyncio.Queue()
_subscribers: list[asyncio.Queue[str]] = []


def _broadcast(run_id: str):
    for q in _subscribers:
        q.put_nowait(run_id)


# ── Lifespan ──────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    loop = asyncio.get_event_loop()
    observer = start_observer(get_runs_dir(), sse_queue, loop)

    async def _dispatcher():
        while True:
            run_id = await sse_queue.get()
            _broadcast(run_id)

    task = asyncio.create_task(_dispatcher())

    # ─── S59 Phase B : auto-start paper traders pour runs deployment_stage=paper ───
    try:
        import sys as _sys
        from pathlib import Path as _Path
        _tl_tools = _Path(__file__).resolve().parent.parent.parent / "trading-lab" / "tools"
        if not _tl_tools.exists():
            _tl_tools = _Path("/Users/sebastiencaron/trading-lab/tools")
        if str(_tl_tools) not in _sys.path:
            _sys.path.insert(0, str(_tl_tools))
        if "paper_orchestrator" in _sys.modules:
            importlib.reload(_sys.modules["paper_orchestrator"])
        import paper_orchestrator as _po
        import json as _json
        runs_dir = get_runs_dir()
        started, failed = 0, 0
        for run_dir in runs_dir.iterdir():
            if not run_dir.is_dir():
                continue
            meta_path = run_dir / "meta.json"
            if not meta_path.exists():
                continue
            try:
                meta = _json.loads(meta_path.read_text())
                if meta.get("d033", {}).get("deployment_stage") == "paper":
                    if not _po.is_running(run_dir.name):
                        r = _po.start(run_dir.name)
                        if r.get("ok") and r.get("started"):
                            started += 1
                            print(f"  [auto-start] ✓ {run_dir.name} (pid {r.get('pid')})", flush=True)
                        elif not r.get("ok"):
                            failed += 1
                            print(f"  [auto-start] ✗ {run_dir.name} : {r.get('error')}", flush=True)
            except Exception as e:
                failed += 1
                print(f"  [auto-start] ✗ {run_dir.name} : {e}", flush=True)
        print(f"[paper-trader] Auto-start summary: {started} started, {failed} failed", flush=True)
    except Exception as e:
        print(f"[paper-trader] Auto-start exception: {e}", flush=True)
    # ─── fin auto-start ─────────────────────────────────────────────────────────

    yield
    task.cancel()
    observer.stop()
    observer.join()


# ── App ───────────────────────────────────────────────────────────────────
app = FastAPI(title="Trading Lab Dashboard API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routes ────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    runs_dir = get_runs_dir()
    total = sum(1 for d in runs_dir.iterdir() if d.is_dir()) if runs_dir.exists() else 0
    return {
        "status": "ok",
        "runs_dir": str(runs_dir),
        "runs_dir_exists": runs_dir.exists(),
        "total_runs": total,
        "port": int(os.getenv("PORT", 8000)),
    }


@app.get("/assets-coverage")
async def get_assets_coverage():
    """S66 — Agrégation par instrument : count strats, best PF, TFs, familles.
    Affiché dans widget compact haut Laboratoire."""
    import re
    runs = read_all_runs()
    coverage: dict = {}
    for r in runs:
        inst = (r.universe.instrument or "").upper()
        if not inst or inst == "?":
            continue
        if inst not in coverage:
            coverage[inst] = {
                "instrument": inst,
                "type": r.universe.type or "",
                "count": 0,
                "best_pf": 0.0,
                "timeframes": set(),
                "families": set(),
            }
        c = coverage[inst]
        c["count"] += 1
        pf = r.kpis.profit_factor if r.kpis and r.kpis.profit_factor else 0.0
        if pf > c["best_pf"]:
            c["best_pf"] = pf
        if r.universe.timeframe:
            c["timeframes"].add(r.universe.timeframe)
        # extraire famille du nom (f1, f2, fabio, etc.)
        m = re.match(r"^(f\d+|fabio)", (r.strategy.name or "").lower())
        if m:
            c["families"].add(m.group(1).upper())
    # Catégoriser
    out = []
    for inst, c in coverage.items():
        c["timeframes"] = sorted(c["timeframes"])
        c["families"] = sorted(c["families"])
        c["best_pf"] = round(c["best_pf"], 2)
        # Classify
        if inst in ("QQQ", "SPY", "IWM", "DIA"): c["category"] = "ETF"
        elif inst in ("NQ", "ES", "YM", "RTY", "CL", "GC", "NG"): c["category"] = "Futures"
        elif "/" in inst or inst in ("EURUSD", "GBPUSD", "USDJPY"): c["category"] = "Forex"
        elif inst.endswith("USD") or inst.endswith("USDT"): c["category"] = "Crypto"
        else: c["category"] = "Autres"
        out.append(c)
    out.sort(key=lambda x: (-x["count"], -x["best_pf"]))
    return {"coverage": out, "total_instruments": len(out), "total_runs": len(runs)}


@app.get("/strategic-reflection")
async def get_strategic_reflection():
    """S66 — Strategic Reflection Agent (hebdo lundi 7h).
    Diagnostic Lab + nouvelles directions + question critique."""
    import json
    from pathlib import Path
    p = Path("/tmp/strategic_reflection.json")
    if not p.exists():
        return {"available": False, "reason": "Brief hebdo pas encore généré"}
    try:
        return {"available": True, **json.loads(p.read_text())}
    except Exception as e:
        return {"available": False, "reason": f"Parse error: {e}"}


@app.get("/daily-brief")
async def get_daily_brief():
    """S66 — Daily Brief généré chaque matin 7h UTC par systemd timer
    sebastien-daily-brief.timer. Agrège T-42 (Scout) + T-44 (Library Gap)
    + T-50 (Hypothesis) + Auto-Evolver marginaux."""
    import json
    from pathlib import Path
    brief_path = Path("/tmp/daily_brief.json")
    if not brief_path.exists():
        return {"available": False, "reason": "Brief pas encore généré — timer démarre demain 7h UTC ou trigger manuel via systemctl --user start sebastien-daily-brief.service"}
    try:
        return {"available": True, **json.loads(brief_path.read_text())}
    except Exception as e:
        return {"available": False, "reason": f"Parse error: {e}"}


@app.get("/runs")
def list_runs():
    return read_all_runs()


@app.get("/runs/{run_id}")
def get_run(run_id: str):
    detail = read_run_detail(run_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' introuvable")
    return detail


@app.get("/stream")
async def stream_runs():
    """SSE — envoie un event 'new_run' à chaque nouveau run détecté."""
    client_queue: asyncio.Queue[str] = asyncio.Queue()
    _subscribers.append(client_queue)

    async def event_generator():
        try:
            yield "data: connected\n\n"
            while True:
                run_id = await asyncio.wait_for(client_queue.get(), timeout=25)
                run = read_run_detail(run_id)
                if run:
                    payload = json.dumps({"event": "new_run", "run": run.model_dump()})
                    yield f"data: {payload}\n\n"
        except asyncio.TimeoutError:
            yield "data: ping\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            _subscribers.remove(client_queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/runs/{run_id}/suggestions")
def get_suggestions(run_id: str):
    """Retourne les suggestions Claude sauvegardées pour ce run."""
    runs_dir = get_runs_dir()
    suggestions_dir = runs_dir / run_id / "suggestions"
    if not suggestions_dir.exists():
        return []
    items = []
    for f in sorted(suggestions_dir.glob("*.json"), reverse=True):
        try:
            items.append(json.loads(f.read_text()))
        except Exception:
            pass
    return items


@app.post("/runs/{run_id}/suggestions")
def save_suggestion(run_id: str, body: SuggestionSave):
    """Sauvegarde une suggestion Claude pour ce run."""
    runs_dir = get_runs_dir()
    suggestions_dir = runs_dir / run_id / "suggestions"
    suggestions_dir.mkdir(parents=True, exist_ok=True)
    from datetime import datetime
    ts = datetime.now().strftime("%Y%m%dT%H%M%S")
    filename = suggestions_dir / f"{ts}.json"
    payload = {
        "id": ts,
        "run_id": run_id,
        "saved_at": datetime.now().isoformat(),
        "prompt": body.prompt,
        "response": body.response,
        "template": body.template,
    }
    filename.write_text(json.dumps(payload, ensure_ascii=False, indent=2))
    return {"ok": True, "id": ts}


@app.delete("/runs/{run_id}/suggestions/{suggestion_id}")
def delete_suggestion(run_id: str, suggestion_id: str):
    """Supprime une suggestion sauvegardée."""
    runs_dir = get_runs_dir()
    f = runs_dir / run_id / "suggestions" / f"{suggestion_id}.json"
    if not f.exists():
        raise HTTPException(status_code=404, detail="Suggestion introuvable")
    f.unlink()
    return {"ok": True}


@app.post("/ai")
async def ai_stream(request: AIRequest):
    """SSE — réponse Claude en streaming avec contexte run injecté.

    ⚠️ DÉSACTIVÉ S55 : clé Anthropic API actuellement non disponible.
    Réactiver quand clé personnelle (Anthropic console) sera créée.
    """
    import os
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    # Detect placeholder / missing / revoked keys
    if not api_key or api_key.startswith("sk-ant-XXX") or len(api_key) < 50:
        raise HTTPException(
            status_code=503,
            detail="Service IA temporairement indisponible : clé Anthropic API personnelle requise. "
                   "Voir docs/setup_anthropic_api.md pour configuration."
        )

    # S59 fix : si pas de run_id (contexte général Laboratoire), continuer sans détail
    detail = read_run_detail(request.run_id) if request.run_id else None

    return StreamingResponse(
        stream_ai_response(request, detail),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Port auto-détection (si lancé directement) ────────────────────────────
def find_free_port(start: int = 8000, end: int = 8100) -> int:
    for port in range(start, end):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("localhost", port)) != 0:
                return port
    raise RuntimeError("Aucun port libre entre 8000 et 8100")


if __name__ == "__main__":
    import uvicorn

    port = find_free_port()
    # Écrire le port dans .port pour que le frontend le lise
    Path("../.port").write_text(str(port))
    print(f"✓ Backend sur http://localhost:{port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)


@app.get("/runs/{run_id}/chart-data")
def get_chart_data(run_id: str, asset: str | None = None, tf: str | None = None):
    """Retourne OHLC bars + markers de trades + overlays pour Lightweight Charts.

    Lit le CSV TwelveData depuis trading-lab/data/long_data/twelvedata_15min/.
    Override asset/tf via query params (default = meta.json du run).
    """
    from datetime import datetime
    import pandas as pd

    detail = read_run_detail(run_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' introuvable")

    instrument = asset or detail.universe.instrument
    timeframe = tf or detail.universe.timeframe

    # Resolve trading-lab data path
    runs_dir = get_runs_dir()
    trading_lab_root = runs_dir.resolve().parent.parent
    data_dir = trading_lab_root / "data"

    # ── Try 1 : pipeline twelvedata (format ETF/forex propre) ─────────────────
    tf_normalized = timeframe.replace("m", "min") if timeframe.endswith("m") else timeframe
    csv_path = data_dir / "long_data" / f"twelvedata_{tf_normalized}" / f"{instrument}_{tf_normalized}.csv"

    df = None
    if csv_path.exists():
        df = pd.read_csv(csv_path, parse_dates=["datetime"], index_col="datetime")

    # ── Try 2 : fallback fichiers TradingView legacy ──────────────────────────
    # Mapping instrument → préfixe TV
    if df is None:
        tv_prefix_map = {
            "ES":  "CME_MINI_ES1!",
            "NQ":  "CME_MINI_NQ1!",
            "YM":  "CBOT_YM1!",
            "RTY": "CME_MINI_RTY1!",
            "CL":  "NYMEX_CL1!",
            "GC":  "COMEX_GC1!",
            "BTC": "BINANCE_BTCUSDT",
            "BTCUSD": "BINANCE_BTCUSDT",
            "ETH": "BINANCE_ETHUSDT",
            "ETHUSD": "BINANCE_ETHUSDT",
            "SOL": "BINANCE_SOLUSD",
            "ADA": "BINANCE_ADAUSD",
            "XRP": "BINANCE_XRPUSD",
        }
        # TF → suffixe TV (TradingView export format)
        tf_suffix_map = {
            "1m": "1", "2m": "2", "3m": "3", "5m": "5", "15m": "15", "30m": "30",
            "1h": "60", "2h": "120", "4h": "240",
            "1d": "1D", "1D": "1D",
            "1w": "1W", "1W": "1W",
        }
        prefix = tv_prefix_map.get(instrument.upper(), instrument)
        tv_tf = tf_suffix_map.get(timeframe, timeframe)

        # Essayer plusieurs patterns nom de fichier TV
        candidates = [
            data_dir / f"{prefix}, {tv_tf}.csv",
            data_dir / f"{prefix}_{tv_tf}.csv",
            data_dir / f"{prefix}, {tv_tf}_RTH.csv",
        ]
        for c in candidates:
            if c.exists():
                csv_path = c
                df_raw = pd.read_csv(c)
                # Format TV : colonnes "time, open, high, low, close, Volume" avec timestamp Unix
                if "time" in df_raw.columns:
                    df_raw["datetime"] = pd.to_datetime(df_raw["time"], unit="s")
                    df_raw = df_raw.set_index("datetime")
                    df_raw = df_raw.rename(columns={"open":"Open","high":"High","low":"Low","close":"Close","volume":"Volume"})
                    df = df_raw
                break

    if df is None:
        raise HTTPException(status_code=404, detail=f"Data file not found for {instrument} {timeframe}")

    if df.index.tz is not None:
        df.index = df.index.tz_localize(None)

    # Filter to run's trading period (from first trade to last trade, +/- 30 days buffer)
    trades = detail.trades or []
    if trades:
        try:
            first_dt = pd.to_datetime(trades[0].entry_dt).tz_localize(None) if trades[0].entry_dt else df.index[0]
            last_dt = pd.to_datetime(trades[-1].exit_dt).tz_localize(None) if trades[-1].exit_dt else df.index[-1]
            df = df.loc[max(df.index[0], first_dt - pd.Timedelta(days=5)) : min(df.index[-1], last_dt + pd.Timedelta(days=5))]
        except (TypeError, ValueError):
            pass

    # Limit bars to 5000 for performance
    if len(df) > 5000:
        df = df.iloc[-5000:]

    bars = [
        {
            "time": int(idx.timestamp()),
            "open": float(row["Open"]),
            "high": float(row["High"]),
            "low": float(row["Low"]),
            "close": float(row["Close"]),
        }
        for idx, row in df.iterrows()
    ]

    # Build trade markers
    markers = []
    for t in trades:
        if not t.entry_dt:
            continue
        try:
            entry_ts = int(pd.to_datetime(t.entry_dt).tz_localize(None).timestamp())
        except (TypeError, ValueError):
            continue
        is_long = t.direction.upper() in ("LONG", "BUY")
        pnl = float(t.pnl_usd or 0)
        is_win = pnl > 0
        markers.append({
            "time": entry_ts,
            "position": "belowBar" if is_long else "aboveBar",
            "color": "#1D9E75" if is_long else "#E24B4A",
            "shape": "arrowUp" if is_long else "arrowDown",
            "text": ("LONG" if is_long else "SHORT") + (" +" if is_win else " -"),
        })

    return {
        "instrument": instrument,
        "timeframe": timeframe,
        "bars": bars,
        "markers": markers,
        "n_bars": len(bars),
        "n_markers": len(markers),
    }


@app.get("/runs/{run_id}/pine")
def get_pine_script(run_id: str):
    """Retourne le contenu du fichier Pine Script V6 associé au run."""
    detail = read_run_detail(run_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' introuvable")

    # Map strategy name → pine file (convention .py → .pine)
    runs_dir = get_runs_dir()
    trading_lab_root = runs_dir.resolve().parent.parent
    strategy_name = detail.strategy.name
    pine_path = trading_lab_root / "strategies" / f"{strategy_name}.pine"

    if not pine_path.exists():
        return {
            "available": False,
            "strategy_name": strategy_name,
            "expected_path": f"strategies/{strategy_name}.pine",
            "message": "Pine Script not generated yet for this strategy.",
        }

    return {
        "available": True,
        "strategy_name": strategy_name,
        "pine_code": pine_path.read_text(encoding="utf-8"),
        "file_size_bytes": pine_path.stat().st_size,
    }




@app.post("/runs/{run_id}/activate")
def activate_run(run_id: str, body: ActivateRequest):
    """Active/désactive une stratégie dans une destination (modifie meta.json d033.deployment_stage)."""
    VALID = {"rd", "paper", "broker", "propfirm", "challenge_z"}
    if body.destination not in VALID:
        raise HTTPException(status_code=400, detail=f"destination doit être l'une de {VALID}")

    runs_dir = get_runs_dir()
    meta_path = runs_dir / run_id / "meta.json"
    if not meta_path.exists():
        raise HTTPException(status_code=404, detail=f"meta.json introuvable pour run '{run_id}'")

    from datetime import datetime
    try:
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"meta.json invalide: {e}")

    meta.setdefault("d033", {})
    previous_stage = meta["d033"].get("deployment_stage", "rd")
    meta["d033"]["deployment_stage"] = body.destination
    meta["d033"]["activated_at"] = datetime.now().isoformat()
    meta["d033"].setdefault("schema_version", "1.0.0")

    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    # Broadcast SSE pour refresh frontend live
    try:
        _broadcast(run_id)
    except Exception:
        pass

    return {
        "ok": True,
        "run_id": run_id,
        "previous_stage": previous_stage,
        "deployment_stage": body.destination,
        "activated_at": meta["d033"]["activated_at"],
    }



# ─── Paper Trader Native — orchestration (S59 Phase B) ──────────────────────
@app.post("/paper-trader/{run_id}/start")
def paper_trader_start(run_id: str):
    """Démarre le paper trader natif pour un run (subprocess Python)."""
    import sys as _sys
    runs_dir = get_runs_dir()
    trading_lab_root = runs_dir.resolve().parent.parent
    orchestrator = trading_lab_root / "tools" / "paper_orchestrator.py"
    if not orchestrator.exists():
        raise HTTPException(status_code=500, detail=f"paper_orchestrator.py introuvable : {orchestrator}")
    try:
        _sys.path.insert(0, str(trading_lab_root / "tools"))
        import importlib
        if "paper_orchestrator" in _sys.modules:
            importlib.reload(_sys.modules["paper_orchestrator"])
        import paper_orchestrator
        result = paper_orchestrator.start(run_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur start : {e}")


@app.post("/paper-trader/{run_id}/stop")
def paper_trader_stop(run_id: str):
    """Stoppe le paper trader natif pour un run."""
    import sys as _sys
    runs_dir = get_runs_dir()
    trading_lab_root = runs_dir.resolve().parent.parent
    _sys.path.insert(0, str(trading_lab_root / "tools"))
    try:
        import importlib
        if "paper_orchestrator" in _sys.modules:
            importlib.reload(_sys.modules["paper_orchestrator"])
        import paper_orchestrator
        return paper_orchestrator.stop(run_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur stop : {e}")


@app.get("/paper-trader/{run_id}/status")
def paper_trader_status(run_id: str):
    """Retourne le statut + état + dernier trade du paper trader pour un run."""
    import sys as _sys
    runs_dir = get_runs_dir()
    trading_lab_root = runs_dir.resolve().parent.parent
    _sys.path.insert(0, str(trading_lab_root / "tools"))
    try:
        import importlib
        if "paper_orchestrator" in _sys.modules:
            importlib.reload(_sys.modules["paper_orchestrator"])
        import paper_orchestrator
        return paper_orchestrator.status(run_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur status : {e}")


@app.get("/paper-trader/activity")
def paper_trader_activity():
    """Retourne l'activité agrégée des paper traders (S60).

    Pour chaque run en paper, retourne :
    - trades_today : nombre de trades aujourd'hui
    - last_trade_ts : timestamp du dernier trade (ou None)

    Global :
    - total_trades_today : somme cross-run
    - active_runs_count : runs avec >= 1 trade aujourd'hui
    - last_trade_global : info du tout dernier trade (run_id + ts + name)
    """
    import csv
    from datetime import datetime, timezone

    runs_dir = get_runs_dir()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    by_run = {}
    total_today = 0
    last_global = None  # {run_id, ts, exit_reason, pnl}

    for run_dir in runs_dir.iterdir():
        if not run_dir.is_dir():
            continue
        # Vérifie si en paper
        meta_p = run_dir / "meta.json"
        if not meta_p.exists():
            continue
        try:
            import json as _json
            meta = _json.loads(meta_p.read_text())
            if meta.get("d033", {}).get("deployment_stage") != "paper":
                continue
        except Exception:
            continue

        trades_csv = run_dir / "paper_trades.csv"
        if not trades_csv.exists():
            by_run[run_dir.name] = {"trades_today": 0, "trades_total": 0, "last_trade_ts": None}
            continue

        trades_today = 0
        trades_total = 0
        last_ts = None
        try:
            with trades_csv.open() as f:
                for row in csv.DictReader(f):
                    trades_total += 1
                    ts = row.get("exit_ts") or row.get("logged_at") or ""
                    if ts.startswith(today):
                        trades_today += 1
                    if not last_ts or ts > last_ts:
                        last_ts = ts
                        if not last_global or ts > last_global.get("ts", ""):
                            last_global = {
                                "run_id": run_dir.name,
                                "ts": ts,
                                "exit_reason": row.get("exit_reason"),
                                "pnl": row.get("pnl"),
                            }
        except Exception:
            pass

        by_run[run_dir.name] = {
            "trades_today": trades_today,
            "trades_total": trades_total,
            "last_trade_ts": last_ts,
        }
        total_today += trades_today

    # active_runs_count = nombre total de paper traders surveillés (runs paper)
    # runs_with_trades_today = nombre qui ont effectivement tradé aujourd'hui
    active_count = len(by_run)
    runs_with_trades_today = sum(1 for v in by_run.values() if v["trades_today"] > 0)

    return {
        "total_trades_today": total_today,
        "active_runs_count": active_count,
        "runs_with_trades_today": runs_with_trades_today,
        "last_trade_global": last_global,
        "by_run": by_run,
    }


@app.get("/paper-trader/list")
def paper_trader_list_running():
    """Liste tous les paper traders actuellement actifs."""
    import sys as _sys
    runs_dir = get_runs_dir()
    trading_lab_root = runs_dir.resolve().parent.parent
    _sys.path.insert(0, str(trading_lab_root / "tools"))
    try:
        import importlib
        if "paper_orchestrator" in _sys.modules:
            importlib.reload(_sys.modules["paper_orchestrator"])
        import paper_orchestrator
        return paper_orchestrator.list_running()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur list : {e}")


# ─── Pause / Resume global (S60) ────────────────────────────────────────────
@app.post("/paper-trader/pause-all")
def paper_trader_pause_all():
    """Stop tous les paper traders actifs (off-hours / weekend). Sauvegarde la liste pour resume."""
    import sys as _sys
    runs_dir = get_runs_dir()
    trading_lab_root = runs_dir.resolve().parent.parent
    _sys.path.insert(0, str(trading_lab_root / "tools"))
    try:
        import importlib
        if "paper_orchestrator" in _sys.modules:
            importlib.reload(_sys.modules["paper_orchestrator"])
        import paper_orchestrator
        return paper_orchestrator.pause_all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur pause-all : {e}")


@app.post("/paper-trader/resume-all")
def paper_trader_resume_all():
    """Reprend tous les paper traders qui étaient actifs avant la pause."""
    import sys as _sys
    runs_dir = get_runs_dir()
    trading_lab_root = runs_dir.resolve().parent.parent
    _sys.path.insert(0, str(trading_lab_root / "tools"))
    try:
        import importlib
        if "paper_orchestrator" in _sys.modules:
            importlib.reload(_sys.modules["paper_orchestrator"])
        import paper_orchestrator
        return paper_orchestrator.resume_all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur resume-all : {e}")


@app.get("/paper-trader/pause-status")
def paper_trader_pause_status():
    """Retourne l'état pause global (paused: bool, run_ids: [...], paused_at: iso)."""
    import sys as _sys
    runs_dir = get_runs_dir()
    trading_lab_root = runs_dir.resolve().parent.parent
    _sys.path.insert(0, str(trading_lab_root / "tools"))
    try:
        import importlib
        if "paper_orchestrator" in _sys.modules:
            importlib.reload(_sys.modules["paper_orchestrator"])
        import paper_orchestrator
        return paper_orchestrator.pause_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur pause-status : {e}")



@app.get("/system-health")
def system_health():
    """T-45 v2 — Audit autonome de tous les paper traders.

    Returns:
      {checked_at, total_paper_runs, green, yellow, red, runs: [{run_id, strategy, status, issues}]}
    """
    try:
        import sys as _sys
        import importlib
        from pathlib import Path as _Path
        _tl_tools = _Path("/Users/sebastiencaron/trading-lab/tools")
        if str(_tl_tools) not in _sys.path:
            _sys.path.insert(0, str(_tl_tools))
        if "system_health" in _sys.modules:
            importlib.reload(_sys.modules["system_health"])
        from system_health import check_run, RUNS_DIR, NOW
        audits = []
        for run_dir in sorted(RUNS_DIR.iterdir()):
            if run_dir.is_dir():
                r = check_run(run_dir)
                if "skip" not in r:
                    audits.append(r)
        return {
            "checked_at": NOW.isoformat(),
            "total_paper_runs": len(audits),
            "green": sum(1 for a in audits if a["status"] == "GREEN"),
            "yellow": sum(1 for a in audits if a["status"] == "YELLOW"),
            "red": sum(1 for a in audits if a["status"] == "RED"),
            "runs": audits,
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}


@app.get("/live-indicators/{symbol}/{tf}")
def get_live_indicators(
    symbol: str, tf: str,
    ema: int | None = None,
    emas: str | None = None,  # NEW : CSV multi-EMA (ex "5,20,50")
    bb_length: int | None = None,
    bb_mult: float | None = 2.0,
    rsi_length: int | None = None,
    avwap: bool = False,
    volume_profile: bool = False,
    limit: int = 200,
):
    """Calcule les indicateurs techniques sur bougies live yfinance. S59 chart overlays."""
    YF_MAP = {
        "QQQ":"QQQ","SPY":"SPY","IWM":"IWM","DIA":"DIA","NDX":"^NDX","US100":"^NDX",
        "ES":"ES=F","NQ":"NQ=F","YM":"YM=F","RTY":"RTY=F",
        "CL":"CL=F","GC":"GC=F","SI":"SI=F",
        "BTC":"BTC-USD","BTCUSD":"BTC-USD","BTCUSDT":"BTC-USD",
        "ETH":"ETH-USD","ETHUSD":"ETH-USD","ETHUSDT":"ETH-USD",
        "EURUSD":"EURUSD=X","GBPUSD":"GBPUSD=X","USDJPY":"USDJPY=X",
    }
    TF_MAP = {
        "1m":("1m","2d"),"2m":("2m","5d"),"5m":("5m","30d"),
        "15m":("15m","60d"),"30m":("30m","60d"),
        "1h":("60m","60d"),"60m":("60m","60d"),
        "1d":("1d","2y"),"1D":("1d","2y"),
    }
    yf_sym = YF_MAP.get(symbol.upper(), symbol)
    yf_interval, period = TF_MAP.get(tf.lower(), ("15m", "60d"))
    try:
        import yfinance as yf
        import pandas as pd
        t = yf.Ticker(yf_sym)
        h = t.history(period=period, interval=yf_interval)
        if h.empty:
            return {"ok": False, "error": "no data"}
        if hasattr(h.index, "tz") and h.index.tz is not None:
            h.index = h.index.tz_localize(None)
        df = h.tail(limit).copy()
        close = df["Close"]
        out = {"ok": True, "symbol": symbol.upper(), "tf": tf, "indicators": {}}
        ts_series = [int(ts.timestamp()) for ts in df.index]

        # EMA (single — legacy)
        if ema and ema > 1:
            ema_vals = close.ewm(span=ema, adjust=False).mean()
            out["indicators"]["ema"] = {
                "length": ema,
                "points": [{"time": t_, "value": round(float(v), 2)} for t_, v in zip(ts_series, ema_vals) if not pd.isna(v)],
            }

        # EMA Multi — S60 (ex emas=5,20,50)
        if emas:
            try:
                ema_lengths = [int(x.strip()) for x in emas.split(",") if x.strip().isdigit() and int(x.strip()) > 1]
                if ema_lengths:
                    multi = []
                    for el in ema_lengths:
                        vals = close.ewm(span=el, adjust=False).mean()
                        multi.append({
                            "length": el,
                            "points": [{"time": t_, "value": round(float(v), 2)} for t_, v in zip(ts_series, vals) if not pd.isna(v)],
                        })
                    out["indicators"]["emas"] = multi
            except Exception:
                pass

        # Bollinger Bands
        if bb_length and bb_length > 1:
            ma = close.rolling(bb_length).mean()
            std = close.rolling(bb_length).std()
            upper = ma + (bb_mult or 2.0) * std
            lower = ma - (bb_mult or 2.0) * std
            out["indicators"]["bb"] = {
                "length": bb_length, "mult": bb_mult,
                "upper": [{"time": t_, "value": round(float(v), 2)} for t_, v in zip(ts_series, upper) if not pd.isna(v)],
                "middle": [{"time": t_, "value": round(float(v), 2)} for t_, v in zip(ts_series, ma) if not pd.isna(v)],
                "lower": [{"time": t_, "value": round(float(v), 2)} for t_, v in zip(ts_series, lower) if not pd.isna(v)],
            }

        # AVWAP (Anchored à la 1ère bougie reçue — simplification)
        if avwap:
            tp = (df["High"] + df["Low"] + df["Close"]) / 3.0
            cum_vol = df["Volume"].cumsum()
            cum_vp = (tp * df["Volume"]).cumsum()
            vwap_vals = cum_vp / cum_vol.replace(0, 1)
            out["indicators"]["avwap"] = {
                "anchored_at": ts_series[0] if ts_series else None,
                "points": [{"time": t_, "value": round(float(v), 2)} for t_, v in zip(ts_series, vwap_vals) if not pd.isna(v)],
            }

        # Volume Profile (POC, VAH, VAL des N dernières sessions)
        if volume_profile:
          try:
            df_vp = df.copy()
            df_vp["_session"] = df_vp.index.normalize()
            sessions_data = []
            for sess_date, sess_df in df_vp.groupby("_session"):
                if len(sess_df) < 5:
                    continue
                s_high = float(sess_df["High"].max())
                s_low = float(sess_df["Low"].min())
                if s_high == s_low:
                    continue
                n_b = 50
                import numpy as _np
                edges = _np.linspace(s_low, s_high, n_b + 1)
                centers = (edges[:-1] + edges[1:]) / 2
                vols = _np.zeros(n_b)
                for _, row in sess_df.iterrows():
                    bl, bh, bv = float(row["Low"]), float(row["High"]), float(row["Volume"])
                    if bh == bl:
                        idx = max(0, min(n_b - 1, _np.searchsorted(edges, bl) - 1))
                        vols[idx] += bv
                        continue
                    i_lo = max(0, _np.searchsorted(edges, bl) - 1)
                    i_hi = min(n_b - 1, _np.searchsorted(edges, bh) - 1)
                    n_cov = i_hi - i_lo + 1
                    if n_cov <= 0:
                        continue
                    per_bin = bv / n_cov
                    for kk in range(i_lo, i_hi + 1):
                        vols[kk] += per_bin
                tot = vols.sum()
                if tot == 0:
                    continue
                poc_idx = int(_np.argmax(vols))
                poc = float(centers[poc_idx])
                target = tot * 0.70
                cum = vols[poc_idx]
                lo, hi = poc_idx, poc_idx
                while cum < target and (lo > 0 or hi < n_b - 1):
                    vu = vols[hi + 1] if hi < n_b - 1 else -1
                    vd = vols[lo - 1] if lo > 0 else -1
                    if vu >= vd and vu >= 0:
                        hi += 1
                        cum += vu
                    elif vd > 0:
                        lo -= 1
                        cum += vd
                    else:
                        break
                vah = float(centers[hi])
                val = float(centers[lo])
                sessions_data.append({
                    "session_date": sess_date.strftime("%Y-%m-%d"),
                    "session_ts": int(sess_date.timestamp()),
                    "poc": round(poc, 2), "vah": round(vah, 2), "val": round(val, 2),
                    "high": round(s_high, 2), "low": round(s_low, 2),
                })
            # Garde les 5 dernières
            out["indicators"]["volume_profile"] = {"sessions": sessions_data[-5:]}
          except Exception as e:
            pass

        # RSI (calcul standard 14 par défaut)
        if rsi_length and rsi_length > 1:
            delta = close.diff()
            gain = delta.where(delta > 0, 0.0)
            loss = -delta.where(delta < 0, 0.0)
            avg_gain = gain.ewm(alpha=1/rsi_length, adjust=False).mean()
            avg_loss = loss.ewm(alpha=1/rsi_length, adjust=False).mean()
            rs = avg_gain / avg_loss.replace(0, 1e-10)
            rsi_vals = 100 - (100 / (1 + rs))
            out["indicators"]["rsi"] = {
                "length": rsi_length,
                "points": [{"time": t_, "value": round(float(v), 2)} for t_, v in zip(ts_series, rsi_vals) if not pd.isna(v)],
            }

        return out
    except Exception as e:
        return {"ok": False, "error": str(e)}


@app.get("/live-bars/{symbol}/{tf}")
def get_live_bars(symbol: str, tf: str, limit: int = 200):
    """Retourne les N dernières bougies yfinance pour un instrument + TF. S59 live chart."""
    YF_MAP = {
        "QQQ":"QQQ","SPY":"SPY","IWM":"IWM","DIA":"DIA","NDX":"^NDX","US100":"^NDX",
        "ES":"ES=F","NQ":"NQ=F","YM":"YM=F","RTY":"RTY=F",
        "CL":"CL=F","GC":"GC=F","SI":"SI=F",
        "BTC":"BTC-USD","BTCUSD":"BTC-USD","BTCUSDT":"BTC-USD",
        "ETH":"ETH-USD","ETHUSD":"ETH-USD","ETHUSDT":"ETH-USD",
        "EURUSD":"EURUSD=X","GBPUSD":"GBPUSD=X","USDJPY":"USDJPY=X",
    }
    TF_MAP = {
        "1m":("1m","2d"), "2m":("2m","5d"), "5m":("5m","30d"),
        "15m":("15m","60d"), "30m":("30m","60d"),
        "1h":("60m","60d"), "60m":("60m","60d"),
        "1d":("1d","2y"), "1D":("1d","2y"),
    }
    yf_sym = YF_MAP.get(symbol.upper(), symbol)
    yf_interval, period = TF_MAP.get(tf.lower(), ("15m", "60d"))
    try:
        import yfinance as yf
        t = yf.Ticker(yf_sym)
        h = t.history(period=period, interval=yf_interval)
        if h.empty:
            return {"ok": False, "error": "no data"}
        if hasattr(h.index, "tz") and h.index.tz is not None:
            h.index = h.index.tz_localize(None)
        bars = []
        for ts, row in h.tail(limit).iterrows():
            bars.append({
                "time": int(ts.timestamp()),
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]) if not (row["Volume"] is None or (isinstance(row["Volume"], float) and (row["Volume"] != row["Volume"]))) else 0,
            })
        return {"ok": True, "symbol": symbol.upper(), "tf": tf, "yf_symbol": yf_sym, "bars": bars}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@app.get("/price/{symbol}")
def get_live_price(symbol: str):
    """Retourne le prix yfinance actuel pour un instrument. S59 live widget."""
    YF_MAP = {
        "QQQ":"QQQ","SPY":"SPY","IWM":"IWM","DIA":"DIA","NDX":"^NDX","US100":"^NDX",
        "ES":"ES=F","NQ":"NQ=F","YM":"YM=F","RTY":"RTY=F",
        "CL":"CL=F","GC":"GC=F","SI":"SI=F",
        "BTC":"BTC-USD","BTCUSD":"BTC-USD","BTCUSDT":"BTC-USD",
        "ETH":"ETH-USD","ETHUSD":"ETH-USD","ETHUSDT":"ETH-USD",
        "EURUSD":"EURUSD=X","GBPUSD":"GBPUSD=X","USDJPY":"USDJPY=X",
    }
    yf_sym = YF_MAP.get(symbol.upper(), symbol)
    try:
        import yfinance as yf
        t = yf.Ticker(yf_sym)
        h = t.history(period="2d", interval="1m")
        if h.empty:
            return {"ok": False, "error": "no data"}
        last = h.iloc[-1]
        first = h.iloc[0]
        last_close = float(last["Close"])
        first_open = float(first["Open"])
        change_pct = ((last_close - first_open) / first_open) * 100 if first_open else 0
        return {
            "ok": True,
            "symbol": symbol.upper(),
            "yf_symbol": yf_sym,
            "price": round(last_close, 2),
            "change_pct": round(change_pct, 3),
            "ts": last.name.isoformat() if hasattr(last.name, "isoformat") else str(last.name),
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}


@app.get("/runs/{run_id}/paper-data")
def get_paper_data(run_id: str):
    """Retourne paper_trades.csv (liste) + paper_state.json (KPIs live) d'un run."""
    import math as _math
    runs_dir = get_runs_dir()
    run_dir = runs_dir / run_id
    if not run_dir.exists():
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' introuvable")

    state_file = run_dir / "paper_state.json"
    trades_csv = run_dir / "paper_trades.csv"

    out = {"run_id": run_id, "state": None, "trades": [], "has_data": False}
    if state_file.exists():
        try:
            out["state"] = json.loads(state_file.read_text())
            out["has_data"] = True
        except Exception:
            pass
    if trades_csv.exists():
        try:
            import pandas as _pd
            df = _pd.read_csv(trades_csv)
            df = df.where(_pd.notnull(df), None)
            out["trades"] = df.to_dict(orient="records")
            out["has_data"] = True
        except Exception:
            pass

    # S63 fix v2 : cleanup récursif global — NaN/inf/numpy types → None ou Python natif
    def _clean(obj):
        if obj is None:
            return None
        if isinstance(obj, float):
            if _math.isnan(obj) or _math.isinf(obj):
                return None
            return obj
        if isinstance(obj, dict):
            return {k: _clean(v) for k, v in obj.items()}
        if isinstance(obj, (list, tuple)):
            return [_clean(v) for v in obj]
        if hasattr(obj, "item"):  # numpy scalar
            try:
                v = obj.item()
                return _clean(v)
            except Exception:
                return str(obj)
        return obj
    return _clean(out)


@app.get("/scout/sources")
def get_scout_sources():
    """Retourne le contenu de trading-lab/data/scout_sources.yaml."""
    import yaml as _yaml

    runs_dir = get_runs_dir()
    trading_lab_root = runs_dir.resolve().parent.parent
    sources_path = trading_lab_root / "data" / "scout_sources.yaml"

    if not sources_path.exists():
        return {"available": False, "sources": [], "message": "Registry not found"}

    try:
        with open(sources_path) as f:
            data = _yaml.safe_load(f)
        sources = data.get("sources", [])
        return {
            "available": True,
            "total": len(sources),
            "active": sum(1 for s in sources if s.get("active", True)),
            "sources": sources,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse registry: {e}")


@app.post("/scout/fetch-new")
def fetch_new_scout_content():
    """S62 — Déclenche scout_check_new_content.py pour fetcher du nouveau contenu RSS.

    Lance le worker en subprocess. Retourne stdout + summary (nb nouveaux items).
    """
    import subprocess
    runs_dir = get_runs_dir()
    trading_lab_root = runs_dir.resolve().parent.parent
    script = trading_lab_root / "tools" / "scout_check_new_content.py"
    if not script.exists():
        raise HTTPException(status_code=500, detail=f"Script not found : {script}")
    try:
        result = subprocess.run(
            ["python3", str(script)],
            cwd=str(trading_lab_root),
            capture_output=True,
            text=True,
            timeout=120,
        )
        # Parse output : compter "✨ N nouveaux items" si présent
        out = result.stdout
        new_items = 0
        for line in out.splitlines():
            if "nouveau" in line.lower() or "nouveaux" in line.lower():
                import re
                m = re.search(r"(\d+)", line)
                if m:
                    new_items = max(new_items, int(m.group(1)))
        return {
            "success": result.returncode == 0,
            "new_items": new_items,
            "stdout": out[-2000:],
            "stderr": result.stderr[-500:] if result.stderr else "",
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Fetch timeout après 120s")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fetch failed : {e}")


@app.get("/scout/inbox")
def get_scout_inbox(status: str | None = None, source: str | None = None):
    """Liste les items dans docs/scout/inbox/ (parsing markdown front-matter).

    Query params :
        - status : pending | flagged | ignored | snoozed
        - source : filter by source name (slug)
    """
    runs_dir = get_runs_dir()
    trading_lab_root = runs_dir.resolve().parent.parent
    inbox_dir = trading_lab_root / "docs" / "scout" / "inbox"

    if not inbox_dir.exists():
        return {"items": [], "total": 0, "message": "Inbox empty"}

    items = []
    for md_file in sorted(inbox_dir.glob("*.md"), reverse=True):
        try:
            text = md_file.read_text(encoding="utf-8")
            lines = text.split("\n")
            title = lines[0].lstrip("# ").strip() if lines else md_file.stem

            def extract(field):
                for line in lines:
                    if f"**{field}**" in line:
                        return line.split(":", 1)[-1].strip().lstrip("*").strip()
                return ""

            source_name = extract("Source")
            url = extract("URL")
            published = extract("Published")
            weight = extract("Weight")
            paradigms = extract("Paradigms (source)")
            import re as _re_status
            status_line = extract("Status")
            m_status = _re_status.search(r"`(pending|flagged|ignored|snoozed|analyzed)`", status_line, _re_status.IGNORECASE)
            if m_status:
                item_status = m_status.group(1).lower()
            else:
                m_status = _re_status.search(r"\b(pending|flagged|ignored|snoozed|analyzed)\b", status_line, _re_status.IGNORECASE)
                item_status = m_status.group(1).lower() if m_status else "pending"

            score = None
            for line in lines:
                if "Score Scout" in line:
                    import re as _re
                    m = _re.search(r"(\d+)\s*/\s*6", line)
                    if m:
                        score = int(m.group(1))
                    break

            if status and item_status != status:
                continue
            if source and source.lower() not in source_name.lower():
                continue

            items.append({
                "filename": md_file.name,
                "title": title,
                "source": source_name,
                "url": url,
                "published": published,
                "weight": weight,
                "paradigms": [p.strip() for p in paradigms.split(",") if p.strip()],
                "status": item_status,
                "score": score,
                "size_bytes": md_file.stat().st_size,
            })
        except Exception:
            continue

    return {"items": items, "total": len(items)}


@app.get("/scout/inbox/{filename}")
def get_scout_inbox_item(filename: str):
    """Retourne le contenu markdown complet d'un item d'inbox."""
    runs_dir = get_runs_dir()
    trading_lab_root = runs_dir.resolve().parent.parent
    item_path = trading_lab_root / "docs" / "scout" / "inbox" / filename

    if not item_path.exists() or not item_path.is_file():
        raise HTTPException(status_code=404, detail=f"Item '{filename}' not found")

    if not item_path.name.endswith(".md"):
        raise HTTPException(status_code=400, detail="Only .md files allowed")

    return {
        "filename": filename,
        "content": item_path.read_text(encoding="utf-8"),
        "size_bytes": item_path.stat().st_size,
    }


@app.post("/scout/inbox/{filename}/status")
def update_scout_item_status(filename: str, new_status: str):
    """Update le status d'un item dans son markdown (`Status: X`).

    new_status : pending | flagged | ignored | snoozed | analyzed
    """
    valid_statuses = {"pending", "flagged", "ignored", "snoozed", "analyzed"}
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid_statuses}")

    runs_dir = get_runs_dir()
    trading_lab_root = runs_dir.resolve().parent.parent
    item_path = trading_lab_root / "docs" / "scout" / "inbox" / filename

    if not item_path.exists():
        raise HTTPException(status_code=404, detail=f"Item '{filename}' not found")

    content = item_path.read_text(encoding="utf-8")
    import re as _re
    new_content = _re.sub(
        r"\*\*Status\*\*\s*:\s*`[^`]*`",
        f"**Status** : `{new_status}`",
        content,
        count=1,
    )
    item_path.write_text(new_content, encoding="utf-8")

    return {"filename": filename, "new_status": new_status, "success": True}



# ── Scout Trader Discovery (T-43 — watchlist 33 traders) ──────────────────

@app.get("/scout/traders/watchlist")
def scout_traders_watchlist():
    """Retourne la watchlist des traders pour le Trader Discovery Pipeline (T-43).

    Lit docs/scout/trader_watchlist.yaml depuis le repo trading-lab et calcule
    le score de priorité pour chaque trader (mode watching uniquement).

    Returns:
        - meta : statistiques (total, par statut)
        - traders : liste complète avec scores
        - top_candidates : top 3 candidats à investiguer
    """
    import sys as _sys
    from datetime import datetime
    runs_dir = get_runs_dir()
    trading_lab_root = runs_dir.resolve().parent.parent
    watchlist_path = trading_lab_root / "docs" / "scout" / "trader_watchlist.yaml"

    if not watchlist_path.exists():
        raise HTTPException(status_code=404, detail=f"Watchlist introuvable : {watchlist_path}")

    try:
        import yaml
        data = yaml.safe_load(watchlist_path.read_text())
    except ImportError:
        # Fallback minimal parser
        data = {"traders": []}
        current = None
        for line in watchlist_path.read_text().splitlines():
            stripped = line.strip()
            if stripped.startswith("- id:"):
                if current:
                    data["traders"].append(current)
                current = {"id": stripped.split(":", 1)[1].strip()}
            elif current and ":" in stripped and not stripped.startswith("#"):
                key, _, val = stripped.partition(":")
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                if key in ("name", "paradigm", "status", "last_check", "skip_reason", "notes"):
                    current[key] = val
        if current:
            data["traders"].append(current)

    traders = data.get("traders", [])

    # Score de priorité (même logique que tools/trader_discovery_scan.py)
    def score(t):
        status = t.get("status", "watching")
        if status == "skip":
            return -1
        if status == "catalogued":
            return 0
        s = 40
        last_check_str = t.get("last_check", "2020-01-01")
        try:
            last_check = datetime.strptime(last_check_str, "%Y-%m-%d")
            days = (datetime.utcnow() - last_check).days
            if days > 60: s += 30
            elif days > 21: s += 20
            elif days > 7: s += 10
        except Exception:
            s += 20
        combined = (t.get("paradigm", "") + " " + t.get("notes", "")).lower()
        kw_pro = ["ict", "smc", "volume profile", "order flow", "auction", "anchored vwap",
                  "liquidity", "session", "london", "killzone"]
        if any(k in combined for k in kw_pro):
            s += 15
        if any(x in combined for x in ["futures", "forex", "es ", "nq ", "eurusd", "gbpusd"]):
            s += 10
        return s

    enriched = []
    for t in traders:
        sc = score(t)
        t2 = dict(t)
        t2["priority_score"] = sc
        enriched.append(t2)

    # Top candidates (status=watching, score décroissant)
    top = sorted(
        [t for t in enriched if t.get("status") == "watching"],
        key=lambda x: x.get("priority_score", 0),
        reverse=True
    )[:3]

    # Stats
    by_status = {}
    for t in enriched:
        st = t.get("status", "unknown")
        by_status[st] = by_status.get(st, 0) + 1

    return {
        "meta": {
            "total": len(enriched),
            "by_status": by_status,
            "last_audit": data.get("meta", {}).get("last_audit_date"),
        },
        "traders": enriched,
        "top_candidates": top,
    }


@app.post("/scout/trader/{trader_id}/skip")
def scout_trader_skip(trader_id: str, reason: str = ""):
    """S62 — Marque un trader comme 'skip' dans trader_watchlist.yaml avec raison.

    Body : ?reason=XXX (string)
    Marque status=skip + skip_reason + last_check à aujourd'hui.
    """
    from datetime import datetime as _dt
    runs_dir = get_runs_dir()
    trading_lab_root = runs_dir.resolve().parent.parent
    watchlist_path = trading_lab_root / "docs" / "scout" / "trader_watchlist.yaml"
    if not watchlist_path.exists():
        raise HTTPException(status_code=404, detail="Watchlist introuvable")
    try:
        import yaml
    except ImportError:
        raise HTTPException(status_code=500, detail="pyyaml requis")
    data = yaml.safe_load(watchlist_path.read_text())
    traders = data.get("traders", [])
    found = None
    for t in traders:
        if t.get("id") == trader_id:
            found = t
            break
    if not found:
        raise HTTPException(status_code=404, detail=f"Trader '{trader_id}' non trouvé")
    found["status"] = "skip"
    found["skip_reason"] = reason or "(pas de raison fournie)"
    found["last_check"] = _dt.now().strftime("%Y-%m-%d")
    # Update meta counts
    meta = data.get("meta", {})
    meta["skip"] = sum(1 for t in traders if t.get("status") == "skip")
    meta["watching"] = sum(1 for t in traders if t.get("status") == "watching")
    data["meta"] = meta
    watchlist_path.write_text(yaml.safe_dump(data, allow_unicode=True, sort_keys=False, default_flow_style=False))
    return {"trader_id": trader_id, "status": "skip", "reason": reason, "success": True}


# ── Scout Hypotheses (T-50 — Combinatorial Hypothesis Generator) ──────────


@app.get("/scout/hypotheses")
def scout_hypotheses(min_score: int = 0, type_filter: str | None = None, limit: int = 100):
    """S62 — Liste les hypothèses combinatoires générées par hypothesis_generator.py.

    Lit le JSON le plus récent dans `results/hypotheses_*.json`.
    Si aucun fichier OU le plus récent date de > 24h → regénère via subprocess.
    """
    import subprocess
    from datetime import datetime as _dt, timezone as _tz

    runs_dir = get_runs_dir()
    trading_lab_root = runs_dir.resolve().parent.parent
    results_dir = trading_lab_root / "results"

    candidates = sorted(results_dir.glob("hypotheses_*.json"), reverse=True)
    source_file = candidates[0] if candidates else None

    needs_regen = False
    if source_file is None:
        needs_regen = True
    else:
        age_sec = _dt.now().timestamp() - source_file.stat().st_mtime
        if age_sec > 86400:
            needs_regen = True

    if needs_regen:
        tool_path = trading_lab_root / "tools" / "hypothesis_generator.py"
        if tool_path.exists():
            today_tag = _dt.now(_tz.utc).strftime("S_%Y%m%d")
            out_json = results_dir / f"hypotheses_{today_tag}.json"
            try:
                subprocess.run(
                    ["python3", str(tool_path), "--n", "20", "--json", str(out_json)],
                    cwd=str(trading_lab_root),
                    check=False,
                    timeout=30,
                    capture_output=True,
                )
                if out_json.exists():
                    source_file = out_json
            except subprocess.TimeoutExpired:
                pass

    if source_file is None or not source_file.exists():
        return {
            "meta": {"generated_at": None, "total": 0, "source_file": None, "error": "No hypothesis file found and generator unavailable"},
            "hypotheses": [],
        }

    try:
        hyps = json.loads(source_file.read_text())
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Hypotheses JSON malformed")

    if type_filter:
        hyps = [h for h in hyps if h.get("type") == type_filter]
    hyps = [h for h in hyps if h.get("score", 0) >= min_score]

    hyps.sort(key=lambda h: h.get("score", 0), reverse=True)

    return {
        "meta": {
            "generated_at": _dt.fromtimestamp(source_file.stat().st_mtime, _tz.utc).isoformat(),
            "total": len(hyps),
            "source_file": source_file.name,
        },
        "hypotheses": hyps[:limit],
    }


# ── Scout Quick Analyzer (T-38 — auto-screening via Claude Haiku) ──────────

@app.post("/scout/analyze/{filename}")
def scout_analyze_item(filename: str):
    """Analyse un item inbox Scout via Claude Haiku (Quick Analyzer T-38).

    Output : score 0-6 par les 6 filtres Scout + classification priority/maybe/skip.
    Coût estimé : ~$0.0001 par item (Haiku 4.5).
    """
    import os
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key or api_key.startswith("sk-ant-XXX") or len(api_key) < 50:
        raise HTTPException(
            status_code=503,
            detail="Service IA indisponible : clé Anthropic API personnelle requise."
        )

    runs_dir = get_runs_dir()
    trading_lab_root = runs_dir.resolve().parent.parent
    item_path = trading_lab_root / "docs" / "scout" / "inbox" / filename
    if not item_path.exists() or not item_path.is_file():
        raise HTTPException(status_code=404, detail=f"Item '{filename}' not found")

    content = item_path.read_text(encoding="utf-8")

    try:
        import anthropic
    except ImportError:
        raise HTTPException(status_code=500, detail="anthropic module not installed in backend env")

    system_prompt = """Tu es un Scout Agent Quick Analyzer pour Trading Lab.
Analyse un item d'inbox (vidéo YouTube trading) selon 6 filtres :
1. Date méthodologie ≥ 2022 (pas pre-2015)
2. RR ≥ 1:2 supporté
3. Paradigme moderne (ICT/SMC/Order Flow/Volume Profile/Liquidity)
4. Données pipeline D-025 compatibles (15min OHLCV TwelveData)
5. Python Ionita implémentable
6. Trader-réel applicability + use case fidelity

Extension Filter #2 : évalue le CONTENU publié, jamais l'auteur historique.

Output JSON strict :
{
  "score": 0-6 (somme filtres passés),
  "classification": "priority" | "maybe" | "skip",
  "paradigmes_detectes": [string],
  "filters": {"date": bool, "rr": bool, "paradigme": bool, "data": bool, "python": bool, "applicability": bool},
  "summary": "1-2 phrases résumé contenu",
  "recommendation": "1 phrase : flag pour charter / snooze / ignore + raison"
}

Classification :
- priority (score ≥ 5) : à reviewer rapidement
- maybe (score 3-4) : à reviewer si temps
- skip (score ≤ 2) : archiver sans review"""

    client = anthropic.Anthropic(api_key=api_key)
    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=system_prompt,
        messages=[{"role": "user", "content": f"Item inbox à analyser :\n\n{content[:3000]}"}],
    )

    response_text = msg.content[0].text

    # Parse JSON from response
    import json as _json
    import re as _re
    json_match = _re.search(r"\{[\s\S]*\}", response_text)
    if json_match:
        try:
            analysis = _json.loads(json_match.group(0))
        except _json.JSONDecodeError:
            analysis = {"raw_response": response_text, "parse_error": True}
    else:
        analysis = {"raw_response": response_text, "parse_error": True}

    return {
        "filename": filename,
        "analysis": analysis,
        "cost_estimate_usd": (msg.usage.input_tokens * 1e-6 + msg.usage.output_tokens * 5e-6),
        "tokens": {"input": msg.usage.input_tokens, "output": msg.usage.output_tokens},
    }
# ─── Desk Agent (D-037) — journal des calls discrétionnaires ──────────────────
@app.get("/desk-agent/calls")
def desk_agent_calls():
    """Retourne les calls discrétionnaires du Desk Agent (D-037).

    Lit trading-lab/results/desk_agent/calls.json (rempli par tools/desk_agent_log.py).
    L'agent décide seul → logue le call → revue conjointe a posteriori (mode Option B).
    """
    runs_dir = get_runs_dir()
    trading_lab_root = runs_dir.resolve().parent.parent
    journal = trading_lab_root / "results" / "desk_agent" / "calls.json"
    if not journal.exists():
        return {"calls": []}
    try:
        data = json.loads(journal.read_text())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Journal Desk Agent illisible : {e}")
    return {"calls": data.get("calls", [])}


# ─── Desk Agent (D-037) v2 — chart-data fenêtré + indicateurs ─────────────────
from pydantic import BaseModel as _BaseModel


class _DeskComment(_BaseModel):
    comment: str


@app.get("/desk-agent/calls/{call_id}/chart-data")
def desk_agent_chart_data(call_id: str):
    """OHLC fenêtré autour du call + EMA(5/20/50) + AVWAP + volume + niveaux du trade."""
    import pandas as pd
    runs_dir = get_runs_dir()
    trading_lab_root = runs_dir.resolve().parent.parent
    journal = trading_lab_root / "results" / "desk_agent" / "calls.json"
    if not journal.exists():
        raise HTTPException(status_code=404, detail="Journal Desk Agent introuvable")
    calls = json.loads(journal.read_text()).get("calls", [])
    call = next((c for c in calls if c.get("id") == call_id), None)
    if not call:
        raise HTTPException(status_code=404, detail=f"Call introuvable: {call_id}")

    instrument = (call.get("asset") or "").upper()
    timeframe = call.get("entry_tf", "15m")
    data_dir = trading_lab_root / "data"
    tf_norm = timeframe.replace("m", "min") if timeframe.endswith("m") else timeframe

    df = None
    used_tf = None
    for tfc in [tf_norm, "15min", "5min"]:
        p = data_dir / "long_data" / f"twelvedata_{tfc}" / f"{instrument}_{tfc}.csv"
        if p.exists():
            df = pd.read_csv(p, parse_dates=["datetime"], index_col="datetime")
            used_tf = tfc
            break
    if df is None or not len(df):
        raise HTTPException(status_code=404, detail=f"Pas de données pour {instrument}")
    if df.index.tz is not None:
        df.index = df.index.tz_localize(None)

    cols = {c.lower(): c for c in df.columns}
    O, H, L, C, V = cols.get("open"), cols.get("high"), cols.get("low"), cols.get("close"), cols.get("volume")

    def _p(ts):
        try:
            return pd.to_datetime(ts).tz_localize(None)
        except Exception:
            return None

    entry_dt = _p(call.get("entry_ts")) or _p(call.get("datetime"))
    if entry_dt is not None:
        pos = int(df.index.searchsorted(entry_dt))
        if pos >= len(df):
            pos = len(df) - 1
        lo = max(0, pos - 70)
        hi = min(len(df), pos + 30)
        win = df.iloc[lo:hi]
        if len(win) < 10:
            win = df.iloc[-120:]
    else:
        win = df.iloc[-120:]

    close = win[C].astype(float)
    ema5 = close.ewm(span=5, adjust=False).mean()
    ema20 = close.ewm(span=20, adjust=False).mean()
    ema50 = close.ewm(span=50, adjust=False).mean()
    aw = None
    if V is not None:
        tp = (win[H].astype(float) + win[L].astype(float) + close) / 3.0
        vv = win[V].astype(float)
        aw = (tp * vv).cumsum() / vv.cumsum().replace(0, pd.NA)

    def _ts(idx):
        return int(pd.Timestamp(idx).timestamp())

    bars, vol, e5, e20, e50, avwap = [], [], [], [], [], []
    for i, (idx, row) in enumerate(win.iterrows()):
        t = _ts(idx)
        o, h, l, c = float(row[O]), float(row[H]), float(row[L]), float(row[C])
        bars.append({"time": t, "open": o, "high": h, "low": l, "close": c})
        e5.append({"time": t, "value": round(float(ema5.iloc[i]), 4)})
        e20.append({"time": t, "value": round(float(ema20.iloc[i]), 4)})
        e50.append({"time": t, "value": round(float(ema50.iloc[i]), 4)})
        if V is not None:
            vol.append({"time": t, "value": float(row[V]), "color": "#15803D55" if c >= o else "#DC262655"})
            if aw is not None and pd.notna(aw.iloc[i]):
                avwap.append({"time": t, "value": round(float(aw.iloc[i]), 4)})

    levels = {
        "direction": call.get("direction"),
        "entry": call.get("entry"),
        "sl": call.get("sl"),
        "tp": call.get("tp"),
        "entry_time": _ts(entry_dt) if entry_dt is not None else None,
        "exit_time": _ts(_p(call.get("exit_ts"))) if _p(call.get("exit_ts")) is not None else None,
    }
    return {
        "instrument": instrument, "timeframe": timeframe, "used_tf": used_tf,
        "bars": bars, "volume": vol, "ema5": e5, "ema20": e20, "ema50": e50,
        "avwap": avwap, "levels": levels,
    }


@app.post("/desk-agent/calls/{call_id}/comment")
def desk_agent_set_comment(call_id: str, body: _DeskComment):
    """Écrit le commentaire de Sebast (revue) dans calls.json."""
    runs_dir = get_runs_dir()
    trading_lab_root = runs_dir.resolve().parent.parent
    journal = trading_lab_root / "results" / "desk_agent" / "calls.json"
    if not journal.exists():
        raise HTTPException(status_code=404, detail="Journal introuvable")
    data = json.loads(journal.read_text())
    call = next((c for c in data.get("calls", []) if c.get("id") == call_id), None)
    if not call:
        raise HTTPException(status_code=404, detail="Call introuvable")
    call.setdefault("review", {})["sebast_comment"] = body.comment
    journal.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    return {"ok": True, "comment": body.comment}


# ─── Récupéré S71 (perdu lors de la restauration s68backup) ───
@app.get("/paper-trader/averages")
def paper_trader_averages():
    """Moyennes KPIs backtest des strategies en paper (deployment_stage=paper).
    Benchmark : comparer une nouvelle strat avant de la pousser en paper (S69)."""
    import json as _json
    runs_dir = get_runs_dir()
    pnl=[]; pnlpct=[]; dd=[]; wr=[]; pf=[]
    n_paper=0; n_skipped=0
    if runs_dir.exists():
        for d in runs_dir.iterdir():
            if not d.is_dir():
                continue
            mp = d / "meta.json"; kp = d / "kpis.json"
            if not mp.exists():
                continue
            try:
                meta = _json.loads(mp.read_text())
            except Exception:
                continue
            if meta.get("d033", {}).get("deployment_stage") != "paper":
                continue
            n_paper += 1
            if not kp.exists():
                n_skipped += 1; continue
            try:
                k = _json.loads(kp.read_text())
                pnl.append(k["pnl"]["total_pnl"])
                pnlpct.append(k["pnl"].get("total_pnl_pct", 0) * 100)
                dd.append(k["drawdown"]["max_drawdown_pct"])
                wr.append(k["ratios"]["win_rate"])
                pf.append(k["ratios"]["profit_factor"])
            except Exception:
                n_skipped += 1
    def avg(x): return round(sum(x)/len(x), 2) if x else None
    return {
        "n_paper": n_paper, "n_valid": len(pnl), "n_skipped": n_skipped,
        "avg_pnl": avg(pnl), "avg_pnl_pct": avg(pnlpct),
        "avg_max_drawdown_pct": avg(dd), "avg_win_rate": avg(wr),
        "avg_profit_factor": avg(pf),
    }


# ─── Pause / Resume global (S60) ────────────────────────────────────────────
