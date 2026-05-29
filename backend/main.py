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
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from ai_handler import stream_ai_response
from data_reader import get_runs_dir, read_all_runs, read_run_detail
from file_watcher import start_observer
from models import AIRequest, SuggestionSave

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

    detail = read_run_detail(request.run_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Run '{request.run_id}' introuvable")

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

    # Resolve trading-lab data path (results/runs/ symlinks → trading-lab/results/runs/)
    runs_dir = get_runs_dir()
    trading_lab_root = runs_dir.resolve().parent.parent
    tf_normalized = timeframe.replace("m", "min") if timeframe.endswith("m") else timeframe
    csv_path = trading_lab_root / "data" / "long_data" / f"twelvedata_{tf_normalized}" / f"{instrument}_{tf_normalized}.csv"

    if not csv_path.exists():
        raise HTTPException(status_code=404, detail=f"Data file not found: {csv_path.name}")

    df = pd.read_csv(csv_path, parse_dates=["datetime"], index_col="datetime")
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

