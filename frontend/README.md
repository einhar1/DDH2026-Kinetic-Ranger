# Kinetic Ranger frontend

This directory contains the Vite, React, and TypeScript operator dashboard for
Kinetic Ranger.

## Functionality

- consumes live, simulated, and replayed radar payloads over WebSocket
- shows receiver mode, connection state, threat level, target metrics, radar
  positions, and RSSI history
- switches the backend between SIM and LIVE AntSDR sources
- starts, pauses, resets, and configures backend simulation
- supports multiple simulated targets and selectable demonstration scenarios
- starts and stops recording of the active source
- lists recorded runs with duration, tick count, and peak severity
- loads recorded runs and provides pause, play, and seek controls
- optionally requests Agent Platform summaries for recorded runs
- reconnects the WebSocket client when the connection is interrupted

The bursty-transmission control is disabled because that signal model is not yet
implemented.

## Install and run

Install dependencies:

```text
pnpm install
```

Start the FastAPI backend from the repository root:

```text
python -m uvicorn kinetic_ranger.api.main:app --reload --port 8000
```

Start the frontend:

```text
pnpm dev
```

Open <http://localhost:5173>.

The checked-in localhost defaults work for normal local development. Backend
schemas in `src/kinetic_ranger/api/schemas.py` and frontend types in
`src/lib/types.ts` must remain aligned.

## Development checks

```text
pnpm lint
pnpm build
pnpm preview
```

GitHub Actions runs lint and a production build for pull requests and pushes to
`main`.

The application is composed in `src/App.tsx`. UI components are in
`src/components/`, while API, WebSocket, and shared type definitions are in
`src/lib/`.
