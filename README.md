# Kinetic Ranger

[![CI](https://github.com/einhar1/DDH2026/actions/workflows/ci.yml/badge.svg)](https://github.com/einhar1/DDH2026/actions/workflows/ci.yml)

Kinetic Ranger is an early-stage passive RF threat-detection prototype with:

- a Python backend package in `src/kinetic_ranger`
- a FastAPI server that exposes a health endpoint and a simulation WebSocket
- a React + TypeScript + Vite frontend in `frontend/`
- simulation-first workflows, with optional live SDR support behind a separate capture layer

Right now, the repository is best thought of as an MVP scaffold that already runs end-to-end in simulation.

## What currently works

### Backend

- `python -m kinetic_ranger simulate` runs the synthetic approach simulation in the terminal
- `python -m kinetic_ranger replay <observations.csv>` replays extracted observations from CSV
- `python -m kinetic_ranger live --iterations 10` reads from an IIO-compatible receiver when the optional hardware dependency is installed
- `python -m uvicorn kinetic_ranger.api.main:app --reload --port 8000` starts a FastAPI app with:
  - `GET /health`
  - run/source/simulation REST endpoints (for run listing, replay loading, recording, source switching, simulation control)
  - optional AI summary endpoint `GET /runs/{run_id}/ai_summary` when enabled
  - `WS /ws/radar`

### Frontend

- `pnpm dev` starts the Vite dashboard
- the UI connects to `ws://localhost:8000/ws/radar`
- the radar view, metrics panel, threat banner, and RSSI history graph render live simulation frames

### Tests

- backend unit tests cover alerting, estimator logic, and feature extraction in `tests/`

## Requirements

- Python 3.11+
- Node.js 20+
- `pnpm` for frontend package management

## Setup

### Python environment

From the repository root, create and activate a virtual environment however you prefer, then install the package:

```text
pip install -e .[dev]
```

If you want AI replay summaries (Vertex AI / Gemini), include the `ai` extra:

```text
pip install -e .[dev,ai]
```

Optional extras:

```text
pip install -e .[dev,hardware,viz]
```

Use the `hardware` extra only if you want the live SDR path. The default development flow works without it.

You can also combine everything in one install:

```text
pip install -e .[dev,ai,hardware,viz]
```

### Frontend dependencies

From `frontend/`:

```text
pnpm install
```

## Running the project

### Terminal simulation

From the repository root:

```text
python -m kinetic_ranger simulate
```

Useful variants:

```text
python -m kinetic_ranger simulate --log-dir runs
python -m kinetic_ranger replay path\to\observations.csv
python -m kinetic_ranger replay path\to\run-dir
python -m kinetic_ranger live --iterations 10
```

See "Recording and replay" below for the run-directory workflow.

### Dashboard

Start the backend from the repository root:

```text
python -m uvicorn kinetic_ranger.api.main:app --reload --port 8000
```

Start the frontend from `frontend/`:

```text
pnpm dev
```

Local URLs:

- API health: <http://localhost:8000/health>
- dashboard: usually <http://localhost:5173>
- WebSocket feed: `ws://localhost:8000/ws/radar`

### Optional AI summaries (Google Gen AI SDK on Vertex AI)

The backend can generate replay summaries for a recorded run using the Google Gen AI SDK against Vertex AI.

1. Install the AI dependency:

```text
pip install -e .[ai]
```

2. Configure environment variables (for example in `.env` at repo root):

```text
KR_AI_SUMMARIES_ENABLED=true
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CLOUD_LOCATION=global
GOOGLE_GENAI_MODEL=gemini-2.5-flash
```

3. Authenticate to Google Cloud in your shell/session before starting the API.

Then request:

```text
GET /runs/{run_id}/ai_summary
```

If AI is disabled, the endpoint returns `403`.
If the real AI request fails or returns an invalid summary, the endpoint returns `502` with an error message instead of a fallback summary.

## Configuration

Default runtime values live in `configs/default.toml`.

Key sections:

- `[radio]` — SDR URI, sample rate, tuning, gain
- `[telemetry]` — CSV telemetry replay settings
- `[estimator]` — EKF initial state and noise tuning
- `[alert]` — alert thresholds and hysteresis
- `[simulation]` — synthetic approach timing and noise parameters

If you run commands from an unusual working directory, pass `--config` explicitly.

## Project layout

```text
DDH2026/
├── configs/
│   └── default.toml
├── frontend/
│   ├── package.json
│   └── src/
│       ├── App.tsx
│       ├── components/
│       └── lib/
├── src/
│   └── kinetic_ranger/
│       ├── api/
│       ├── alerting/
│       ├── estimation/
│       ├── logging/
│       ├── radio/
│       ├── telemetry/
│       ├── ui/
│       ├── cli.py
│       ├── config.py
│       └── models.py
└── tests/
```

## Recording and replay

Every CLI command (`simulate`, `replay`, `live`) accepts `--log-dir <root>` and
writes a self-contained **run directory** under it. Same for the FastAPI
service when `KR_REPLAY_SOURCE` points at one.

```text
runs/20260513-142208_simulate/
├── manifest.json       # schema_version, mode, started_at_s, duration_s, tick_count, config_hash
├── snapshots.jsonl     # one JSON object per tick: observation + estimate + alert + telemetry
├── observations.csv    # produced by `export` — same schema the CSV replay accepts
├── telemetry.csv       # only when telemetry was logged
└── alerts.csv          # flat alert decisions
```

Typical workflow:

```text
# 1. Record
python -m kinetic_ranger simulate --log-dir runs

# 2. Export flat CSVs for analysis tools
python -m kinetic_ranger export runs\20260513-142208_simulate

# 3. Replay the recorded run through the CLI pipeline
python -m kinetic_ranger replay runs\20260513-142208_simulate
```

To replay a recording through the dashboard, point the backend at the run
directory before starting it:

```text
# PowerShell
$env:KR_REPLAY_SOURCE = "runs\20260513-142208_simulate"

# bash/zsh
export KR_REPLAY_SOURCE="runs/20260513-142208_simulate"

python -m uvicorn kinetic_ranger.api.main:app --reload --port 8000
```

The dashboard renders it identically to a live run; the WebSocket payload's
`mode` field switches to `"replay"`.

## Notes about current limitations

- simulation controls are mostly wired to backend endpoints; some options (for example bursty TX) remain intentionally disabled/placeholders
- by default, backend startup attempts live SDR first and falls back to synthetic simulation if hardware is unavailable
- the live SDR path is optional and assumes an IIO-compatible device workflow
- the frontend currently assumes the backend is available at `localhost:8000`

## Runtime environment variables

The API loads `.env` on startup (`python-dotenv` is included).

- `KR_RUNS_DIR` — overrides default run directory root (`runs/`)
- `KR_REPLAY_SOURCE` — if set to a run directory, backend serves replay frames instead of live/simulation
- `KR_AI_SUMMARIES_ENABLED` — enables/disables AI summaries endpoint
- `GOOGLE_CLOUD_PROJECT` — GCP project used by the AI summarizer
- `GOOGLE_CLOUD_LOCATION` — Vertex AI location (defaults to `global`)
- `GOOGLE_GENAI_MODEL` — Gemini model name (defaults to `gemini-2.5-flash`)

## Development checks

From the repository root:

```text
pytest
```

From `frontend/`:

```text
pnpm lint
pnpm build
```

## Continuous integration

GitHub Actions runs the same checks for every push and pull request:

- `Backend tests` installs Python 3.11 dependencies and runs `pytest`
- `Frontend checks` installs the locked pnpm dependencies, runs ESLint, and builds the production bundle

The jobs run in parallel and can also be started manually from the repository's
Actions page. To prevent unverified changes from being merged, configure branch
protection for the main branch and require both `Backend tests` and
`Frontend checks` to pass.

## Frontend docs

See `frontend/README.md` for frontend-specific notes.
