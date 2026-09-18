import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { authorizeCredentials } from "@/server/auth/credentials";
import { upsertGoogleUser } from "@/server/auth/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        return authorizeCredentials({
          email: credentials?.email,
          password: credentials?.password,
        });
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          return await upsertGoogleUser({
            email: user.email,
            name: user.name,
            image: user.image,
            googleSubject: account.providerAccountId,
          });
        } catch {
          return false;
        }
      }
      return user.status !== "suspended";
    },
  },
});
