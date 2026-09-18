import type { TrackingConnectionState } from "@/features/tracking/types";

export function connectionLabel(state: TrackingConnectionState): string {
  if (state === "connected") {
    return "Connected";
  }
  if (state === "connecting") {
    return "Connecting";
  }
  if (state === "disconnected") {
    return "Disconnected";
  }
  if (state === "unauthorized") {
    return "Not authorized";
  }
  if (state === "unconfigured") {
    return "Realtime server not configured";
  }
  return "Idle";
}

export function TrackingStatusBar({
  connection,
  trackingActive,
  sharing,
  lastUpdated,
  error,
}: {
  connection: TrackingConnectionState;
  trackingActive: boolean;
  sharing?: boolean;
  lastUpdated?: string;
  error?: string;
}) {
  return (
    <div className="space-y-2" data-tracking-status="1">
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Connection</dt>
          <dd data-connection={connection}>{connectionLabel(connection)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Tracking</dt>
          <dd data-tracking-active={trackingActive ? "true" : "false"}>
            {trackingActive ? "Active" : "Not active"}
          </dd>
        </div>
        {sharing !== undefined ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">GPS sharing</dt>
            <dd data-sharing={sharing ? "on" : "off"}>{sharing ? "On" : "Off"}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Last update</dt>
          <dd data-last-updated={lastUpdated ? "1" : "0"}>
            {lastUpdated ? new Date(lastUpdated).toLocaleString() : "No position yet"}
          </dd>
        </div>
      </dl>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
