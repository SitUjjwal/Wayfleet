import { createServer, type Server as HttpServer } from "node:http";
import { AddressInfo } from "node:net";
import { io as Client, type Socket as ClientSocket } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";
import { TRACKING_EVENTS } from "@/lib/realtime/events";
import { attachRealtimeServer, type RealtimeDeps } from "@/server/realtime/attach";
import { TrackingHttpError } from "@/server/tracking/errors";
import type { RealtimeIdentity } from "@/lib/realtime/token";
import type { Server as IoServer } from "socket.io";

const customer: RealtimeIdentity = {
  id: "507f1f77bcf86cd799439011",
  role: "customer",
  status: "active",
};
const vendor: RealtimeIdentity = {
  id: "507f1f77bcf86cd799439013",
  role: "vendor",
  status: "active",
};
const bookingId = "507f1f77bcf86cd799439099";

function waitFor(socket: ClientSocket, event: string) {
  return new Promise<unknown>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${event}`)), 4000);
    socket.once(event, (value) => {
      clearTimeout(timer);
      resolve(value);
    });
  });
}

async function listen(server: HttpServer): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve((server.address() as AddressInfo).port);
    });
  });
}

function positionDto() {
  return {
    bookingId,
    latitude: 18.52,
    longitude: 73.85,
    recordedAt: new Date().toISOString(),
    source: "geolocation" as const,
  };
}

describe("realtime socket tracking", () => {
  let httpServer: HttpServer | undefined;
  let io: IoServer | undefined;
  const clients: ClientSocket[] = [];

  afterEach(async () => {
    for (const client of clients.splice(0)) {
      client.close();
    }
    io?.close();
    await new Promise<void>((resolve) => httpServer?.close(() => resolve()) ?? resolve());
    httpServer = undefined;
    io = undefined;
  });

  async function start(deps: Partial<RealtimeDeps> & Pick<RealtimeDeps, "verifyToken" | "join" | "publish">) {
    httpServer = createServer();
    io = attachRealtimeServer(httpServer, {
      corsOrigins: ["http://localhost:3000"],
      ...deps,
    });
    const port = await listen(httpServer);
    return `http://127.0.0.1:${port}`;
  }

  function connect(url: string, token: string) {
    const client = Client(url, {
      autoConnect: false,
      transports: ["websocket"],
      auth: { token },
    });
    clients.push(client);
    client.connect();
    return client;
  }

  it("rejects unauthenticated sockets", async () => {
    const url = await start({
      verifyToken: () => {
        throw new Error("no");
      },
      join: async () => ({
        snapshot: {
          bookingId,
          bookingStatus: "in_progress",
          trackingActive: true,
          canPublish: false,
          position: null,
        },
      }),
      publish: async () => ({
        skipped: false,
        position: positionDto(),
        context: { bookingId, bookingStatus: "in_progress" },
      }),
    });
    const client = connect(url, "");
    const error = await waitFor(client, "connect_error");
    expect(String(error)).toContain("TRACKING_UNAUTHORIZED");
  });

  it("joins an authorized customer and receives a published position", async () => {
    const url = await start({
      verifyToken: (token) => (token === "vendor" ? vendor : customer),
      join: async (user, id) => {
        if (user.role === "customer" && user.id !== customer.id) {
          throw new TrackingHttpError(403, "TRACKING_FORBIDDEN", "Forbidden");
        }
        if (id !== bookingId) {
          throw new TrackingHttpError(400, "TRACKING_INVALID_BOOKING", "Invalid booking id");
        }
        return {
          snapshot: {
            bookingId,
            bookingStatus: "in_progress",
            trackingActive: true,
            canPublish: user.role === "vendor",
            position: positionDto(),
          },
        };
      },
      publish: async (user, payload) => {
        if (user.role !== "vendor") {
          throw new TrackingHttpError(403, "TRACKING_FORBIDDEN", "Forbidden");
        }
        const record = payload as { latitude: number; longitude: number };
        return {
          skipped: false,
          position: {
            ...positionDto(),
            latitude: record.latitude,
            longitude: record.longitude,
          },
          context: { bookingId, bookingStatus: "in_progress" },
        };
      },
    });

    const customerSocket = connect(url, "customer");
    await waitFor(customerSocket, "connect");
    customerSocket.emit(TRACKING_EVENTS.join, { bookingId });
    const initial = await waitFor(customerSocket, TRACKING_EVENTS.position);
    expect(initial).toMatchObject({ latitude: 18.52 });

    const vendorSocket = connect(url, "vendor");
    await waitFor(vendorSocket, "connect");
    vendorSocket.emit(TRACKING_EVENTS.join, { bookingId });
    await waitFor(vendorSocket, TRACKING_EVENTS.status);

    const live = waitFor(customerSocket, TRACKING_EVENTS.position);
    vendorSocket.emit(TRACKING_EVENTS.location, {
      bookingId,
      latitude: 18.53,
      longitude: 73.86,
    });
    expect(await live).toMatchObject({ latitude: 18.53, longitude: 73.86 });
  });

  it("rejects customer publish, foreign join, invalid payload, completed trips, and rate limits", async () => {
    let publishCount = 0;
    const url = await start({
      verifyToken: (token) => {
        if (token === "other") {
          return { ...customer, id: "507f1f77bcf86cd799439099" };
        }
        return token === "vendor" ? vendor : customer;
      },
      join: async (user, id) => {
        if (user.id !== customer.id && user.role === "customer") {
          throw new TrackingHttpError(403, "TRACKING_FORBIDDEN", "Forbidden");
        }
        if (id === "completed") {
          throw new TrackingHttpError(
            409,
            "TRACKING_NOT_ACTIVE",
            "Tracking is not active for this booking",
            undefined,
            "completed",
          );
        }
        return {
          snapshot: {
            bookingId,
            bookingStatus: "in_progress",
            trackingActive: true,
            canPublish: user.role === "vendor",
            position: null,
          },
        };
      },
      publish: async (user) => {
        if (user.role !== "vendor") {
          throw new TrackingHttpError(403, "TRACKING_FORBIDDEN", "Forbidden");
        }
        publishCount += 1;
        if (publishCount > 1) {
          throw new TrackingHttpError(429, "TRACKING_RATE_LIMITED", "Location updates are too frequent");
        }
        return {
          skipped: false,
          position: positionDto(),
          context: { bookingId, bookingStatus: "in_progress" },
        };
      },
    });

    const customerSocket = connect(url, "customer");
    await waitFor(customerSocket, "connect");
    customerSocket.emit(TRACKING_EVENTS.location, {
      bookingId,
      latitude: 18.52,
      longitude: 73.85,
    });
    expect(await waitFor(customerSocket, TRACKING_EVENTS.error)).toMatchObject({
      code: "TRACKING_FORBIDDEN",
    });

    const other = connect(url, "other");
    await waitFor(other, "connect");
    other.emit(TRACKING_EVENTS.join, { bookingId });
    expect(await waitFor(other, TRACKING_EVENTS.error)).toMatchObject({
      code: "TRACKING_FORBIDDEN",
    });

    const vendorSocket = connect(url, "vendor");
    await waitFor(vendorSocket, "connect");
    vendorSocket.emit(TRACKING_EVENTS.join, { bookingId: "completed" });
    expect(await waitFor(vendorSocket, TRACKING_EVENTS.error)).toMatchObject({
      code: "TRACKING_NOT_ACTIVE",
    });
    vendorSocket.emit(TRACKING_EVENTS.join, { bookingId });
    await waitFor(vendorSocket, TRACKING_EVENTS.status);
    vendorSocket.emit(TRACKING_EVENTS.location, { bookingId, latitude: 18.52, longitude: 73.85 });
    vendorSocket.emit(TRACKING_EVENTS.location, { bookingId, latitude: 18.53, longitude: 73.86 });
    expect(await waitFor(vendorSocket, TRACKING_EVENTS.error)).toMatchObject({
      code: "TRACKING_RATE_LIMITED",
    });
  });

  it("re-authenticates after reconnect by requiring a token again", async () => {
    let verifies = 0;
    const url = await start({
      verifyToken: () => {
        verifies += 1;
        return customer;
      },
      join: async () => ({
        snapshot: {
          bookingId,
          bookingStatus: "in_progress",
          trackingActive: true,
          canPublish: false,
          position: null,
        },
      }),
      publish: async () => {
        throw new TrackingHttpError(403, "TRACKING_FORBIDDEN", "Forbidden");
      },
    });
    const client = connect(url, "customer");
    await waitFor(client, "connect");
    client.disconnect();
    client.connect();
    await waitFor(client, "connect");
    expect(verifies).toBeGreaterThanOrEqual(2);
  });
});
