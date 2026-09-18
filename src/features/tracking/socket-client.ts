"use client";

import { io, type Socket } from "socket.io-client";
import { getBrowserRealtimeUrl } from "@/lib/realtime/config";
import { TRACKING_EVENTS } from "@/lib/realtime/events";
import { fetchRealtimeToken } from "@/features/tracking/tracking-api";
import type { TrackingPosition } from "@/features/tracking/types";
import type { TrackingErrorPayload, TrackingStatusPayload } from "@/server/tracking/dto";

export type TrackingSocketHandlers = {
  onPosition?: (position: TrackingPosition) => void;
  onStatus?: (status: TrackingStatusPayload) => void;
  onError?: (error: TrackingErrorPayload) => void;
  onConnection?: (state: "connecting" | "connected" | "disconnected") => void;
};

export function createTrackingSocket(
  bookingId: string,
  handlers: TrackingSocketHandlers,
): Socket | null {
  const url = getBrowserRealtimeUrl();
  if (!url) {
    return null;
  }

  const socket = io(url, {
    autoConnect: false,
    withCredentials: true,
    transports: ["websocket", "polling"],
    auth: (callback) => {
      void fetchRealtimeToken().then(({ status, body }) => {
        if (status === 200 && body.success) {
          callback({ token: body.data.token });
          return;
        }
        callback({ token: "" });
      });
    },
  });

  socket.on("connect", () => {
    handlers.onConnection?.("connected");
    joinTrackingRoom(socket, bookingId);
  });
  socket.on("disconnect", () => handlers.onConnection?.("disconnected"));
  socket.on("connect_error", () => handlers.onConnection?.("disconnected"));
  socket.on(TRACKING_EVENTS.position, (payload: TrackingPosition) => {
    handlers.onPosition?.(payload);
  });
  socket.on(TRACKING_EVENTS.status, (payload: TrackingStatusPayload) => {
    handlers.onStatus?.(payload);
  });
  socket.on(TRACKING_EVENTS.error, (payload: TrackingErrorPayload) => {
    handlers.onError?.(payload);
  });

  return socket;
}

export function joinTrackingRoom(socket: Socket, bookingId: string) {
  socket.emit(TRACKING_EVENTS.join, { bookingId });
}

export function leaveTrackingRoom(socket: Socket, bookingId: string) {
  socket.emit(TRACKING_EVENTS.leave, { bookingId });
}

export function publishTrackingLocation(
  socket: Socket,
  payload: {
    bookingId: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    heading?: number;
    speed?: number;
    recordedAt: string;
  },
) {
  socket.emit(TRACKING_EVENTS.location, payload);
}
