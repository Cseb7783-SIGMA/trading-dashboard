"""Watchdog observer — détecte nouveaux runs et les pousse dans la SSE queue."""
from __future__ import annotations

import asyncio
import time
from pathlib import Path

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer


class RunCreatedHandler(FileSystemEventHandler):
    def __init__(self, queue: asyncio.Queue, loop: asyncio.AbstractEventLoop):
        self._queue = queue
        self._loop = loop
        self._pending: set[str] = set()

    def on_created(self, event):
        if not event.is_directory:
            return
        run_dir = Path(event.src_path)
        run_id = run_dir.name
        if run_id in self._pending:
            return
        self._pending.add(run_id)
        # debounce 3s pour laisser meta.json + kpis.json être écrits
        def _push():
            time.sleep(3)
            meta = run_dir / "meta.json"
            kpis = run_dir / "kpis.json"
            if meta.exists() and kpis.exists():
                asyncio.run_coroutine_threadsafe(
                    self._queue.put(run_id), self._loop
                )
            self._pending.discard(run_id)

        import threading
        threading.Thread(target=_push, daemon=True).start()


def start_observer(runs_dir: Path, queue: asyncio.Queue, loop: asyncio.AbstractEventLoop) -> Observer:
    handler = RunCreatedHandler(queue, loop)
    observer = Observer()
    observer.schedule(handler, str(runs_dir), recursive=False)
    observer.start()
    return observer
