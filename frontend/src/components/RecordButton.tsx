import { useEffect, useState } from 'react';
import {
  getRecordingStatus,
  startRecording,
  stopRecording,
} from '../lib/runsApi';
import type { Mode, RecordingStatus } from '../lib/types';

interface Props {
  mode: Mode | null;
  onRecordingStopped?: (info: { run_id: string; tick_count: number }) => void;
  onMessage?: (text: string) => void;
}

function formatElapsed(seconds: number): string {
  const totalSec = Math.floor(seconds);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function RecordButton({ mode, onRecordingStopped, onMessage }: Props) {
  const [status, setStatus] = useState<RecordingStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const notify = (text: string) => {
    if (onMessage) {
      onMessage(text);
    } else {
      console.log(text);
    }
  };

  // Poll recording status every 1000 ms
  useEffect(() => {
    async function fetchStatus() {
      try {
        const s = await getRecordingStatus();
        setStatus(s);
      } catch (err) {
        console.error('Failed to fetch recording status', err);
      }
    }

    fetchStatus();
    const id = setInterval(fetchStatus, 1000);
    return () => clearInterval(id);
  }, []);

  // Elapsed time ticker while recording
  useEffect(() => {
    if (!status?.recording || status.started_at_s == null) {
      return;
    }

    const startedAt = status.started_at_s;
    const tick = () => {
      setElapsedSeconds(Math.max(0, Date.now() / 1000 - startedAt));
    };

    const initialTickId = window.setTimeout(tick, 0);
    const id = setInterval(tick, 500);
    return () => {
      clearTimeout(initialTickId);
      clearInterval(id);
    };
  }, [status?.recording, status?.started_at_s]);

  const recording = status?.recording ?? false;

  async function handleToggle() {
    if (busy) return;
    setBusy(true);
    try {
      if (!recording) {
        // Optimistically flip to recording
        setStatus((prev) =>
          prev
            ? { ...prev, recording: true }
            : { recording: true, run_id: null, started_at_s: Date.now() / 1000, tick_count: 0 },
        );
        try {
          const res = await startRecording();
          notify(`Recording started — run ${res.run_id}`);
        } catch (err) {
          notify(`Start recording failed: ${err instanceof Error ? err.message : String(err)}`);
          // Revert optimistic update
          setStatus((prev) => prev ? { ...prev, recording: false } : prev);
        }
      } else {
        // Optimistically flip to idle
        setStatus((prev) =>
          prev ? { ...prev, recording: false } : prev,
        );
        try {
          const res = await stopRecording();
          notify(`Recording saved — ${res.duration_s.toFixed(1)} s, ${res.tick_count} ticks`);
          onRecordingStopped?.({ run_id: res.run_id, tick_count: res.tick_count });
        } catch (err) {
          notify(`Stop recording failed: ${err instanceof Error ? err.message : String(err)}`);
          // Revert optimistic update
          setStatus((prev) => prev ? { ...prev, recording: true } : prev);
        }
      }
    } finally {
      // Refresh authoritative status after either branch
      try {
        const s = await getRecordingStatus();
        setStatus(s);
      } catch {
        // ignore — poller will catch up
      }
      setBusy(false);
    }
  }

  return (
    <button
      className={`record-button ${recording ? 'record-button--active' : 'record-button--idle'}`}
      onClick={handleToggle}
      disabled={mode === 'replay' || busy}
      title={mode === 'replay' ? 'stop replay first' : undefined}
    >
      <span className="record-button__dot" />
      {recording ? (
        <>
          <span>REC</span>
          <span className="record-button__elapsed">{formatElapsed(elapsedSeconds)}</span>
        </>
      ) : (
        <span>● REC</span>
      )}
    </button>
  );
}
