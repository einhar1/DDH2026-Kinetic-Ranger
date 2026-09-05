# AGENTS.md

Practical guidance for AI coding agents working in this repository.

## Project snapshot

Kinetic Ranger is a working passive RF closure-detection application with:

- a Python package and FastAPI backend in `src/kinetic_ranger/`
- live capture from a Pluto/IIO-compatible AntSDR
- simulation and recorded-run replay through the same processing pipeline
- a React, TypeScript, and Vite operator dashboard in `frontend/`
- recording, CSV export, optional Agent Platform summaries, and GitHub Actions CI

Read the root [`README.md`](./README.md), the frontend
[`frontend/README.md`](./frontend/README.md), and the relevant source before
changing behavior. Treat the code and tests as the source of truth.

## Repository map

Key backend areas:

- `api/` — FastAPI setup, REST routes, WebSocket streaming, runtime sources,
  recording, and AI-summary endpoint
- `radio/` — simulated and AntSDR capture plus IQ feature extraction
- `estimation/` and `alerting/` — tracking and threat evaluation
- `logging/` — run writing, reading, replay input, and CSV export
- `cli.py` — `live`, `simulate`, `replay`, and `export` commands
- `config.py`, `models.py`, and `api/schemas.py` — configuration and contracts

Key frontend areas:

- `App.tsx` — dashboard composition and WebSocket lifecycle
- `components/` — visualization and live/simulation/record/replay controls
- `lib/types.ts` — frontend wire types
- `lib/websocket.ts` and `lib/runsApi.ts` — backend clients

## Working principles

- Keep changes focused and avoid unrelated cleanup.
- Preserve the shared processing path across live, simulated, and replayed data.
- Use simulation and replay for repeatable automated tests; validate against
  hardware when a change affects capture or live-source behavior.
- Keep hardware-specific code behind the capture/source boundary.
- Keep documentation concise. Document settings users normally need to change,
  rather than duplicating every default from `configs/default.toml`.

## Backend/frontend contracts

When changing radar payloads or API data:

- update backend schemas in `src/kinetic_ranger/api/schemas.py`
- update matching frontend types in `frontend/src/lib/types.ts`
- check consumers in `frontend/src/App.tsx` and related components

Type drift can break the dashboard without an obvious backend error.

## Commands

From the repository root:

```text
pip install -e .[dev,hardware]
python -m pytest
python -m kinetic_ranger simulate
python -m kinetic_ranger live
python -m uvicorn kinetic_ranger.api.main:app --reload --port 8000
```

From `frontend/`:

```text
pnpm install
pnpm lint
pnpm build
pnpm dev
```

The checked-in configuration and localhost frontend URLs cover normal local
development. Change them only when the hardware, network, or deployment differs.

## Change guidance

- Add or update tests for estimator, alerting, parsing, recording, replay, or
  feature-extraction changes.
- Verify both backend and frontend when changing a shared API contract.
- Keep live capture functional; do not silently replace hardware behavior with
  simulation.
- Preserve graceful API startup fallback to simulation when hardware is absent.
- Update this file and the README when capabilities or workflows materially
  change.

Current design constraints include first-channel live capture, no measured
bearing from the single-antenna setup, and no absolute live range without known
transmitter power. Do not describe those estimates as direct measurements.
