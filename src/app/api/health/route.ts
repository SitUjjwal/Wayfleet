import { NextResponse } from "next/server";
import { getMongoConnectionState, isMongoConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "wayfleet",
    milestone: 10,
    database: {
      configured: isMongoConfigured(),
      state: getMongoConnectionState(),
    },
  });
}
