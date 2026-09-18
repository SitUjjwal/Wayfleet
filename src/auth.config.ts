import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import type { AccountStatus, UserRole } from "@/types/domain";
import {
  AUTH_COOKIE_MAX_AGE_SECONDS,
  isGoogleOAuthConfigured,
  parseAccountStatus,
  parseUserRole,
} from "@/server/auth/types";

export function googleAuthProviders(): NextAuthConfig["providers"] {
  if (!isGoogleOAuthConfigured()) {
    return [];
  }

  return [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      issuer: "https://accounts.google.com",
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name ?? "Google user",
          email: profile.email,
          image: profile.picture,
          role: "customer" as UserRole,
          status: "active" as AccountStatus,
        };
      },
    }),
  ];
}

export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: googleAuthProviders(),
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.status = user.status;
        if (user.image) {
          token.picture = user.image;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = parseUserRole(token.role) ?? "customer";
        session.user.status = parseAccountStatus(token.status) ?? "pending";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
