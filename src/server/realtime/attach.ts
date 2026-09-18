import type { Server as HttpServer } from "node:http";
import type { Socket } from "socket.io";
import { Server } from "socket.io";
import { TRACKING_EVENTS } from "@/lib/realtime/events";
import { trackingRoom } from "@/lib/realtime/rooms";
import type { RealtimeIdentity } from "@/lib/realtime/token";
import type { TrackingErrorPayload, TrackingSnapshotDto, TrackingStatusPayload } from "@/server/tracking/dto";
import { TrackingHttpError } from "@/server/tracking/errors";

export type RealtimeJoinResult = {
  snapshot: TrackingSnapshotDto;
};

export type RealtimePublishResult = {
  snapshot?: TrackingSnapshotDto;
  position: TrackingSnapshotDto["position"];
  skipped: boolean;
  context: { bookingId: string; bookingStatus: TrackingSnapshotDto["bookingStatus"] };
};

export type RealtimeDeps = {
  verifyToken: (token: string) => RealtimeIdentity;
  join: (user: RealtimeIdentity, bookingId: string) => Promise<RealtimeJoinResult>;
  publish: (user: RealtimeIdentity, payload: unknown) => Promise<RealtimePublishResult>;
  corsOrigins: string[];
};

type SocketData = {
  user: RealtimeIdentity;
  rooms: Set<string>;
};

function emitError(socket: Socket, error: unknown) {
  const payload: TrackingErrorPayload =
    error instanceof TrackingHttpError
      ? { code: error.code, message: error.message }
      : { code: "TRACKING_UNAUTHORIZED", message: "Unauthorized" };
  if (
    error instanceof TrackingHttpError ||
    (error instanceof Error && error.message.startsWith("TRACKING_"))
  ) {
    socket.emit(TRACKING_EVENTS.error, payload);
    return;
  }
  if (error instanceof Error && "status" in error && (error as { status: number }).status === 403) {
    socket.emit(TRACKING_EVENTS.error, { code: "TRACKING_FORBIDDEN", message: "Forbidden" });
    return;
  }
  socket.emit(TRACKING_EVENTS.error, payload);
}

function readBookingId(payload: unknown): string {
  if (typeof payload === "string") {
    return payload.trim();
  }
  if (payload && typeof payload === "object" && "bookingId" in payload) {
    const value = (payload as { bookingId: unknown }).bookingId;
    return typeof value === "string" ? value.trim() : "";
  }
  return "";
}

export function attachRealtimeServer(httpServer: HttpServer, deps: RealtimeDeps) {
  const io = new Server(httpServer, {
    cors: {
      origin: deps.corsOrigins,
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string" || !token.trim()) {
      next(new Error("TRACKING_UNAUTHORIZED"));
      return;
    }
    try {
      const user = deps.verifyToken(token);
      socket.data.user = user;
      socket.data.rooms = new Set<string>();
      next();
    } catch {
      next(new Error("TRACKING_UNAUTHORIZED"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const data = socket.data as SocketData;

    socket.on(TRACKING_EVENTS.join, async (payload: unknown) => {
      const bookingId = readBookingId(payload);
      try {
        const result = await deps.join(data.user, bookingId);
        const room = trackingRoom(result.snapshot.bookingId);
        await socket.join(room);
        data.rooms.add(room);
        const status: TrackingStatusPayload = {
          bookingId: result.snapshot.bookingId,
          bookingStatus: result.snapshot.bookingStatus,
          trackingActive: result.snapshot.trackingActive,
        };
        socket.emit(TRACKING_EVENTS.status, status);
        if (result.snapshot.position) {
          socket.emit(TRACKING_EVENTS.position, result.snapshot.position);
        }
      } catch (error) {
        emitError(socket, error);
      }
    });

    socket.on(TRACKING_EVENTS.leave, async (payload: unknown) => {
      const bookingId = readBookingId(payload);
      if (!bookingId) {
        return;
      }
      const room = trackingRoom(bookingId);
      await socket.leave(room);
      data.rooms.delete(room);
    });

    socket.on(TRACKING_EVENTS.location, async (payload: unknown) => {
      try {
        const result = await deps.publish(data.user, payload);
        if (result.skipped) {
          return;
        }
        const room = trackingRoom(result.context.bookingId);
        if (result.position) {
          io.to(room).emit(TRACKING_EVENTS.position, result.position);
        }
      } catch (error) {
        if (error instanceof TrackingHttpError && error.code === "TRACKING_NOT_ACTIVE") {
          const bookingId = readBookingId(payload);
          if (bookingId) {
            const room = trackingRoom(bookingId);
            const status: TrackingStatusPayload = {
              bookingId,
              bookingStatus: error.bookingStatus ?? "cancelled",
              trackingActive: false,
            };
            io.to(room).emit(TRACKING_EVENTS.status, status);
            io.in(room).socketsLeave(room);
          }
        }
        emitError(socket, error);
      }
    });
  });

  return io;
}
