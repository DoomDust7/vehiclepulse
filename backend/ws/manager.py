import asyncio
import json
import logging
import time
from typing import Optional
from fastapi import WebSocket

log = logging.getLogger("vehiclepulse.ws")


class ConnectionManager:
    """
    Manages WebSocket clients and batches outgoing frames every broadcast_interval_ms.
    A slow or disconnected client never blocks other clients — errors are caught per-client.
    """

    def __init__(self, broadcast_interval_ms: int = 100):
        self._clients: list[WebSocket] = []
        self._pending: list[dict] = []
        self._interval = broadcast_interval_ms / 1000.0
        self._task: Optional[asyncio.Task] = None

    def start(self) -> None:
        self._task = asyncio.create_task(self._flush_loop())

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._clients.append(ws)
        log.info("ws_connect total=%d", len(self._clients))

    def disconnect(self, ws: WebSocket) -> None:
        self._clients = [c for c in self._clients if c is not ws]
        log.info("ws_disconnect total=%d", len(self._clients))

    async def broadcast(self, message: dict) -> None:
        self._pending.append(message)

    async def send_direct(self, ws: WebSocket, message: dict) -> None:
        try:
            await ws.send_text(json.dumps(message))
        except Exception:
            self.disconnect(ws)

    async def _flush_loop(self) -> None:
        while True:
            await asyncio.sleep(self._interval)
            if not self._pending or not self._clients:
                self._pending.clear()
                continue

            batch = self._pending[:]
            self._pending.clear()

            frame = json.dumps({"type": "batch", "messages": batch})
            dead: list[WebSocket] = []
            for client in self._clients:
                try:
                    await client.send_text(frame)
                except Exception:
                    dead.append(client)

            for ws in dead:
                self.disconnect(ws)

    @property
    def client_count(self) -> int:
        return len(self._clients)
