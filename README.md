# Kinetic Ranger

[![CI](https://github.com/einhar1/DDH2026/actions/workflows/ci.yml/badge.svg)](https://github.com/einhar1/DDH2026/actions/workflows/ci.yml)

Kinetic Ranger is a passive RF closure-detection system for observing whether a
radio transmitter is approaching the receiver. It supports a real
Pluto/IIO-compatible AntSDR, simulation, and replay through the same processing
pipeline.

The application provides:

- live IQ capture and RF feature extraction
- Doppler- and RSSI-based motion estimates
- configurable threat alerts
- a React operator dashboard with live WebSocket updates
- recording, replay, and CSV export
- optional recorded-run summaries through Agent Platform

The system architecture is documented in
[`docs/architecture.mmd`](docs/architecture.mmd).

## Requirements

- Python 3.11 or newer
- Node.js 24 and pnpm for the dashboard
- for live capture: a reachable Pluto/IIO-compatible AntSDR and the
  `hardware` dependency extra

## Install

From the repository root:

```text
python -m venv .venv
.venv\Scripts\activate
pip install -e .[dev,hardware]

cd frontend
pnpm install
```

On macOS or Linux, activate the environment with
`source .venv/bin/activate`. The `hardware` extra may be omitted when only
simulation and replay are needed.

## Run the dashboard

Start the backend from the repository root:

```text
python -m uvicorn kinetic_ranger.api.main:app --reload --port 8000
```

In another terminal, start the frontend from `frontend/`:

```text
pnpm dev
```

Open <http://localhost:5173>.

The backend first attempts to connect to the configured AntSDR. If the receiver
is unavailable, it starts in simulation mode instead. Use the dashboard's
`LIVE` and `SIM` controls to switch source or retry the hardware connection.

The checked-in defaults in [`configs/default.toml`](configs/default.toml) are
intended for normal use and do not need to be changed unless the receiver,
network address, or radio setup differs. A network configuration example is
available in [`docs/netplan/`](docs/netplan/).

## Operating modes

- **Live:** captures IQ samples from the AntSDR and streams analyzed frames to
  the dashboard.
- **Simulation:** generates one or more approaching transmitters. The dashboard
  can start, pause, reset, and adjust a demonstration.
- **Replay:** loads a recorded run through the same estimation and alerting
  pipeline, with play, pause, and seek controls.

The equivalent CLI commands are:

```text
python -m kinetic_ranger live
python -m kinetic_ranger simulate
python -m kinetic_ranger replay <run-directory>
```

## Recording and export

Recordings can be started and stopped in the dashboard. Saved runs can then be
listed, replayed, and inspected there.

To export a run to flat CSV files:

```text
python -m kinetic_ranger export <run-directory>
```

Run data is stored under `runs/` by default.

## Optional Agent Platform summaries

Recorded-run summaries are disabled by default. To enable them, install the AI
extra and provide the required Google Cloud settings:

```text
pip install -e .[ai]
```

```powershell
$env:KR_AI_SUMMARIES_ENABLED = "true"
$env:GOOGLE_CLOUD_PROJECT = "your-project-id"
$env:GOOGLE_CLOUD_LOCATION = "global"
```

Authentication uses Google Application Default Credentials. The model has a
working default and normally does not need to be configured.

## Development and CI

Run backend checks from the repository root:

```text
python -m pytest
```

Run frontend checks from `frontend/`:

```text
pnpm lint
pnpm build
```

GitHub Actions runs these backend and frontend checks for pull requests, pushes
to `main`, and manual workflow runs.

## Current limitations

- Live capture uses the receiver's first RX channel.
- A single antenna does not provide measured bearing; live and replay views use
  a fixed display bearing.
- Live range is not absolute because transmitter power is unknown. The useful
  outputs are RSSI trend, closing-rate estimate, and time-to-intercept estimate.
- The time-to-intercept estimate assumes approximately constant velocity and a
  straight approach.
- The backend currently implements the direct-approach simulation. Other
  scenario choices in the frontend are presentation presets.
- Full browser-to-hardware operation is verified manually; automated tests cover
  the processing, alerting, API-supporting logic, and recording/replay paths.

Frontend-specific notes are in [`frontend/README.md`](frontend/README.md).
