import { createServer } from "node:http";
import { connectDb, isMongoConfigured } from "@/lib/db";
import { getRealtimePort } from "@/lib/realtime/config";
import { attachRealtimeServer } from "@/server/realtime/attach";
import { createProductionRealtimeDeps } from "@/server/realtime/deps";

const port = getRealtimePort();

const httpServer = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        ok: true,
        service: "wayfleet-realtime",
        milestone: 10,
        database: { configured: isMongoConfigured() },
      }),
    );
    return;
  }
  response.writeHead(404);
  response.end();
});

async function main() {
  if (!isMongoConfigured()) {
    console.error("MONGODB_URI is required for the realtime server");
    process.exit(1);
  }
  await connectDb();
  attachRealtimeServer(httpServer, createProductionRealtimeDeps());
  httpServer.listen(port, "0.0.0.0", () => {
    console.info(`Wayfleet realtime listening on ${port}`);
  });
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "startup_failed";
  console.error("Realtime server failed", { message });
  process.exit(1);
});
