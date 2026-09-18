import { NextRequest, NextResponse } from "next/server";
import { handlers } from "@/auth";

export const runtime = "nodejs";

export const { POST } = handlers;

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const isGoogleCallback = url.pathname.endsWith("/callback/google");
  if (
    isGoogleCallback &&
    !url.searchParams.has("code") &&
    !url.searchParams.has("error")
  ) {
    const login = new URL("/login", request.nextUrl.origin);
    login.searchParams.set("error", "google");
    return NextResponse.redirect(login);
  }
  return handlers.GET(request);
}
