"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createTrackingSocket,
  leaveTrackingRoom,
  publishTrackingLocation,
} from "@/features/tracking/socket-client";
import { fetchTrackingSnapshot } from "@/features/tracking/tracking-api";
import type {
  TrackingConnectionState,
  TrackingPosition,
  TrackingSnapshot,
} from "@/features/tracking/types";
import { getBrowserRealtimeUrl } from "@/lib/realtime/config";
import { TRACKING_MIN_INTERVAL_MS } from "@/lib/tracking/constants";
import {
  geolocationMessage,
  watchBrowserLocation,
  type WatchHandle,
} from "@/lib/maps/geolocation";
import type { TrackingErrorPayload } from "@/server/tracking/dto";

function derivedConnection(
  trackingActive: boolean,
  socketState: TrackingConnectionState,
): TrackingConnectionState {
  if (!trackingActive) {
    return "idle";
  }
  if (!getBrowserRealtimeUrl()) {
    return "unconfigured";
  }
  return socketState;
}

export function useTrackingSession({
  bookingId,
  initial,
}: {
  bookingId: string;
  initial: TrackingSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initial);
  const [socketState, setSocketState] = useState<TrackingConnectionState>("connecting");
  const [error, setError] = useState<string>();
  const [sharing, setSharing] = useState(false);
  const [gpsState, setGpsState] = useState<string>("idle");
  const socketRef = useRef<ReturnType<typeof createTrackingSocket>>(null);
  const watchRef = useRef<WatchHandle | null>(null);
  const lastSentRef = useRef(0);
  const connection = derivedConnection(snapshot.trackingActive, socketState);

  const refreshSnapshot = useCallback(async () => {
    const { status, body } = await fetchTrackingSnapshot(bookingId);
    if (status === 200 && body.success) {
      setSnapshot(body.data);
      setError(undefined);
      return body.data;
    }
    if (status === 401 || status === 403) {
      setSocketState("unauthorized");
      setError(body.success === false ? body.error : "Forbidden");
    } else if (body.success === false) {
      setError(body.error);
    }
    return null;
  }, [bookingId]);

  useEffect(() => {
    if (!snapshot.trackingActive || !getBrowserRealtimeUrl()) {
      return;
    }
    const socket = createTrackingSocket(bookingId, {
      onConnection: (state) => {
        setSocketState(state);
        if (state === "connected") {
          void refreshSnapshot();
        }
      },
      onPosition: (position: TrackingPosition) => {
        setSnapshot((current) => ({ ...current, position }));
      },
      onStatus: (status) => {
        setSnapshot((current) => ({
          ...current,
          bookingStatus: status.bookingStatus,
          trackingActive: status.trackingActive,
          canPublish: current.canPublish && status.trackingActive,
          position: status.trackingActive ? current.position : null,
        }));
        if (!status.trackingActive) {
          setSharing(false);
        }
      },
      onError: (payload: TrackingErrorPayload) => {
        setError(payload.message);
        if (payload.code === "TRACKING_UNAUTHORIZED" || payload.code === "TRACKING_FORBIDDEN") {
          setSocketState("unauthorized");
        }
      },
    });
    socketRef.current = socket;
    socket?.connect();
    return () => {
      if (socket) {
        leaveTrackingRoom(socket, bookingId);
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [bookingId, snapshot.trackingActive, refreshSnapshot]);

  useEffect(() => {
    if (!sharing || !snapshot.canPublish) {
      watchRef.current?.stop();
      watchRef.current = null;
      return;
    }
    watchRef.current = watchBrowserLocation((result) => {
      if (!result.ok) {
        setGpsState(result.reason);
        setError(geolocationMessage(result.reason));
        setSharing(false);
        return;
      }
      setGpsState("active");
      const now = Date.now();
      if (now - lastSentRef.current < TRACKING_MIN_INTERVAL_MS) {
        return;
      }
      const socket = socketRef.current;
      if (!socket?.connected) {
        setError("Realtime connection is not ready.");
        return;
      }
      lastSentRef.current = now;
      publishTrackingLocation(socket, {
        bookingId,
        latitude: result.latitude,
        longitude: result.longitude,
        recordedAt: new Date(result.recordedAt).toISOString(),
        ...(result.accuracy !== undefined ? { accuracy: result.accuracy } : {}),
        ...(result.heading !== undefined ? { heading: result.heading } : {}),
        ...(result.speed !== undefined ? { speed: result.speed } : {}),
      });
    });
    return () => {
      watchRef.current?.stop();
      watchRef.current = null;
    };
  }, [sharing, snapshot.canPublish, bookingId]);

  return {
    snapshot,
    connection,
    error,
    sharing,
    gpsState,
    startSharing() {
      setError(undefined);
      setGpsState("requesting");
      setSharing(true);
    },
    stopSharing() {
      setSharing(false);
      setGpsState("idle");
    },
  };
}
