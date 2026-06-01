# VehiclePulse

A real-time OBD-II vehicle diagnostic tool that streams live sensor data from an ELM327 adapter, detects threshold faults with freeze-frame context, and provides a React dashboard for monitoring and offline session analysis.

**Live demo:** [vehiclepulse.vercel.app](https://vehiclepulse.vercel.app) (UI preview — connect your own backend)

---

## Overview

VehiclePulse reads live CAN bus data via ELM327, decodes DTCs against the SAE J1979 standard, and streams 10+ PID sensor channels (RPM, coolant temp, MAF, O2, throttle position, and more) to a React frontend over WebSocket at 10 Hz.

When a sensor crosses a configurable threshold, the system logs a **freeze-frame** — a snapshot of all active PID values at the exact moment of the fault — enabling fast offline triage via replay and CSV export endpoints.

### Why it was built

During development, O2 sensor PID readings were triggering false fault alerts intermittently. Root-cause investigation revealed that the ELM327 adapter, under high-frequency polling across 10+ channels, was occasionally returning a **stale response from a previous PID query** for a different channel — causing the decoder to assign the wrong value to the O2 PID.

The fix: every ELM327 response is validated at the **protocol layer** by cross-checking the returned `mode + PID` header bytes against the issued command before any decoding occurs. This is enforced in [`PIDValidator`](backend/obd/pid_validator.py) and cannot be bypassed.

---

## Architecture

```
ELM327 (USB serial)
    ↓
OBDConnector  ──  circuit breaker (3 failures → OPEN → exponential backoff)
    ↓
OBDPoller  ──  10 Hz round-robin across 11 PIDs
    ↓
PIDValidator  ──  cross-check mode+PID bytes before decode (root fix)
    ↓
asyncio.Queue (bounded, maxsize=500)  ──  back-pressure
    ↙               ↘
ReadingBuffer       ConnectionManager
1s batch flush      100ms batch broadcast
    ↓                   ↓
SQLite (WAL)        React Dashboard
    ↓
FastAPI  ──  /sessions, /replay, /export/csv, /faults, /freeze-frame
```

### System design patterns applied

| Pattern | Where |
|---|---|
| Event-driven fan-out | `asyncio.Queue` → DB writer + WS broadcaster + fault engine |
| Back-pressure | Bounded queue (500); drops readings on full rather than OOM |
| Circuit breaker | `OBDConnector`: CLOSED → OPEN → HALF_OPEN with backoff |
| CQRS-lite | Write path (poller → DB) separated from read path (FastAPI) |
| Cursor pagination | `/replay?cursor=<ts>` — O(log n) vs O(n) offset pagination |
| Streaming export | `StreamingResponse` generator yields CSV rows in 1 000-row chunks |
| Sliding-window rate limiter | Per-rule fault cooldown prevents alert storms at threshold boundary |
| Structured logging | JSON log entries with `ts, level, module, event, pid, session_id` |
| Stateless API layer | FastAPI routers hold no state — horizontally scalable |
| Hot/cold path separation | Hot: in-memory WS broadcast (<100 ms). Cold: SQLite 1 s batch flush |

---

## Stack

| Layer | Technology |
|---|---|
| OBD interface | `python-obd`, ELM327 adapter (USB or Bluetooth) |
| Backend | Python 3.12, FastAPI, SQLAlchemy, SQLite (WAL mode) |
| Realtime | WebSocket (Starlette), `asyncio` |
| Frontend | React 18, TypeScript, Vite, Zustand |
| Containerisation | Docker, Docker Compose |
| Deployment | Vercel (frontend), Docker (backend) |

---

## Sensor channels

| PID | Name | Unit |
|---|---|---|
| `04` | Engine Load | % |
| `05` | Coolant Temperature | °C |
| `06` | Short-Term Fuel Trim Bank 1 | % |
| `0B` | Intake Manifold Pressure | kPa |
| `0C` | Engine RPM | rpm |
| `0D` | Vehicle Speed | km/h |
| `0F` | Intake Air Temperature | °C |
| `10` | Mass Air Flow | g/s |
| `11` | Throttle Position | % |
| `14` | O2 Sensor 1 | V |
| `15` | O2 Sensor 2 | V |

---

## Quickstart

### Mock mode (no hardware required)

```bash
# Clone
git clone https://github.com/DoomDust7/vehiclepulse.git
cd vehiclepulse

# Start backend (mock adapter simulates all sensors)
MOCK_MODE=true DB_PATH=./data/vehiclepulse.db \
  uvicorn backend.main:app --port 8000

# Start frontend (separate terminal)
cd frontend && npm install && npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

The mock adapter:
- Generates realistic sensor waveforms (sinusoidal RPM, ramping coolant temp, oscillating O2 voltage)
- Triggers a coolant fault at ~2 minutes (temp ramps from 85°C → 115°C)
- Injects a deliberate stale ELM327 response every 60 seconds to exercise `PIDValidator`

### Docker Compose

```bash
# Mock mode
MOCK_MODE=true docker-compose up

# Real ELM327 adapter (uncomment `devices:` in docker-compose.yml first)
MOCK_MODE=false SERIAL_PORT=/dev/ttyUSB0 docker-compose up
```

### Real hardware

1. Plug the ELM327 adapter into the OBD-II port (under the dashboard)
2. Note the serial port: `ls /dev/tty*` (usually `/dev/ttyUSB0` on Linux, `/dev/tty.usbserial-*` on macOS)
3. Set `MOCK_MODE=false` and `SERIAL_PORT=<your-port>` in `.env`
4. Uncomment the `devices:` section in `docker-compose.yml`
5. `docker-compose up`

---

## API reference

All endpoints are prefixed `/api/v1`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/sessions/` | List all recorded sessions |
| `GET` | `/sessions/{id}` | Session detail |
| `GET` | `/sessions/{id}/replay` | Paginated PID readings (`?cursor=<ts>&limit=500`) |
| `GET` | `/sessions/{id}/replay/stream` | SSE stream at configurable playback speed (`?speed=1.0`) |
| `GET` | `/sessions/{id}/faults` | Fault events for a session |
| `GET` | `/sessions/{id}/export/csv` | Download full session as CSV |
| `GET` | `/sessions/{id}/export/faults-csv` | Fault events only as CSV |
| `GET` | `/faults/{id}/freeze-frame` | Freeze-frame snapshot for a fault |
| `GET` | `/config/thresholds` | Current threshold rules |
| `PUT` | `/config/thresholds` | Update threshold rules (live, no restart) |
| `GET` | `/health` | System health + adapter status |
| `WS` | `/ws` | Live PID readings + fault events (100 ms batched frames) |

### WebSocket message format

```json
{
  "type": "batch",
  "messages": [
    {
      "type": "pid_reading",
      "payload": {
        "session_id": "uuid",
        "ts": 1717200000.123,
        "pid": "0C",
        "name": "RPM",
        "value": 1726.0,
        "unit": "rpm",
        "valid": true
      }
    },
    {
      "type": "fault_event",
      "payload": {
        "id": "uuid",
        "pid": "05",
        "pid_name": "COOLANT_TEMP",
        "value": 112.0,
        "threshold_op": "gt",
        "threshold_val": 110.0,
        "severity": "warning",
        "freeze_frame_id": "uuid"
      }
    }
  ]
}
```

---

## Configuration

Copy `.env.example` to `.env` and edit:

```env
MOCK_MODE=true              # true = synthetic data, no hardware needed
SERIAL_PORT=/dev/ttyUSB0   # ELM327 serial port (real mode only)
DB_PATH=./data/vehiclepulse.db
LOG_LEVEL=INFO
VEHICLE_VIN=                # optional
```

Frontend environment variables (set in Vercel dashboard or `.env.local`):

```env
VITE_WS_URL=ws://your-backend-host:8000/ws
VITE_API_URL=http://your-backend-host:8000
```

---

## Project structure

```
vehiclepulse/
├── backend/
│   ├── obd/
│   │   ├── pid_validator.py     # PID header cross-check (stale-response fix)
│   │   ├── pid_registry.py      # SAE J1979 PID definitions + scaling formulas
│   │   ├── poller.py            # Async 10 Hz polling loop
│   │   ├── mock_adapter.py      # Synthetic sensor data for development
│   │   └── connector.py        # ELM327 connection + circuit breaker
│   ├── fault/
│   │   ├── threshold_engine.py  # Per-PID rule evaluation with cooldown
│   │   ├── dtc_decoder.py       # SAE J1979 DTC lookup table
│   │   └── freeze_frame.py      # Freeze-frame capture at fault moment
│   ├── db/
│   │   ├── models.py            # SQLAlchemy ORM (Session, PIDReading, FaultEvent, FreezeFrame)
│   │   ├── database.py          # SQLite engine + WAL mode
│   │   └── crud.py              # CRUD helpers, batched reading buffer
│   ├── ws/
│   │   └── manager.py           # WebSocket connection manager + batched broadcast
│   ├── routers/                 # FastAPI route handlers
│   └── main.py                  # App entrypoint + lifespan
├── frontend/
│   └── src/
│       ├── components/          # Dashboard, GaugeCard, FaultPanel, FreezeFrameModal, ...
│       ├── hooks/               # useWebSocket, usePIDStream
│       ├── store/pidStore.ts    # Zustand state
│       └── api/client.ts        # Typed REST wrappers
├── docker-compose.yml
└── .env.example
```

---

## License

MIT
