import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { roleForPath } from "@/server/auth/types";

const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const pathname = request.nextUrl.pathname;
  const requiredRole = roleForPath(pathname);
  if (!requiredRole) {
    return NextResponse.next();
  }

  const user = request.auth?.user;
  if (!user?.id || user.status === "suspended") {
    const login = new URL("/login", request.nextUrl.origin);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  if (user.role !== requiredRole) {
    return NextResponse.redirect(new URL("/forbidden", request.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/customer/:path*", "/vendor/:path*", "/admin/:path*"],
};
