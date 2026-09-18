import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/guards";
import { authTestPayload } from "@/server/auth/test-endpoint";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const requestedRole = new URL(request.url).searchParams.get("role");
  const result = authTestPayload(user, requestedRole);
  return NextResponse.json(result.body, { status: result.status });
}
