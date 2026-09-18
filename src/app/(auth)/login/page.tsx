import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/features/auth/login-form";
import { isGoogleOAuthConfigured, homePathForRole, safeCallbackUrl } from "@/server/auth/types";

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

function oauthErrorMessage(error?: string): string | undefined {
  if (!error) {
    return undefined;
  }
  if (error === "Configuration" || error === "google" || error === "OAuthCallback") {
    return "Google sign-in failed. Open http://localhost:3000/login — not the ngrok URL — and confirm the Google redirect URI is exactly http://localhost:3000/api/auth/callback/google.";
  }
  if (error === "AccessDenied") {
    return "Google sign-in was denied or the account could not be created.";
  }
  return "Sign-in failed. Try email and password, or Google again.";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session?.user?.role) {
    redirect(homePathForRole(session.user.role));
  }

  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl) ?? undefined;

  return (
    <section className="mx-auto w-full max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-navy">Sign in</h1>
      <p className="mt-2 text-sm text-muted">
        Use your email and password. Google sign-in is optional and requires
        platform credentials.
      </p>
      <div className="mt-8 rounded-2xl border border-line bg-paper-strong p-6 shadow-sm">
        <LoginForm
          callbackUrl={callbackUrl}
          googleEnabled={isGoogleOAuthConfigured()}
          oauthError={oauthErrorMessage(params.error)}
        />
      </div>
    </section>
  );
}
