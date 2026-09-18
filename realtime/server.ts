import { createServer } from "node:http";
import {
  connectDb,
  getMongoConnectionState,
  isMongoConfigured,
} from "@/lib/db";
import { getRealtimePort } from "@/lib/realtime/config";
import { attachRealtimeServer } from "@/server/realtime/attach";
import { createProductionRealtimeDeps } from "@/server/realtime/deps";

const port = getRealtimePort();
const MONGO_RETRY_MS = 10_000;

const httpServer = createServer((request, response) => {
  if (request.url === "/health") {
    const state = getMongoConnectionState();
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        ok: true,
        service: "wayfleet-realtime",
        milestone: 10,
        database: {
          configured: isMongoConfigured(),
          connected: state === "connected",
          state,
        },
      }),
    );
    return;
  }
  response.writeHead(404);
  response.end();
});

async function connectWithRetry(): Promise<void> {
  for (;;) {
    try {
      await connectDb();
      console.info("MongoDB connected");
      return;
    } catch {
      console.error("MongoDB not reachable yet; retrying", {
        delayMs: MONGO_RETRY_MS,
      });
      await new Promise((resolve) => setTimeout(resolve, MONGO_RETRY_MS));
    }
  }
}

async function main() {
  if (!isMongoConfigured()) {
    console.error("MONGODB_URI is required for the realtime server");
    process.exit(1);
  }
  attachRealtimeServer(httpServer, createProductionRealtimeDeps());
  httpServer.listen(port, "0.0.0.0", () => {
    console.info(`Wayfleet realtime listening on ${port}`);
  });
  await connectWithRetry();
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "startup_failed";
  console.error("Realtime server failed", { message });
  process.exit(1);
});
