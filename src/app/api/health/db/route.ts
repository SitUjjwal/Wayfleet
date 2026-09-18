import { NextResponse } from "next/server";
import {
  connectDb,
  getMongoConnectionState,
  isMongoConfigured,
  pingMongo,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isMongoConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        connected: false,
        configured: false,
        state: getMongoConnectionState(),
      },
      { status: 503 },
    );
  }

  try {
    await connectDb();
    const pinged = await pingMongo();
    const state = getMongoConnectionState();
    const connected = pinged && state === "connected";

    return NextResponse.json(
      {
        ok: connected,
        connected,
        configured: true,
        state,
      },
      { status: connected ? 200 : 503 },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        connected: false,
        configured: true,
        state: "error",
      },
      { status: 503 },
    );
  }
}
