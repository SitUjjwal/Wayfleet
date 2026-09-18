import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RegisterForm } from "@/features/auth/register-form";
import { homePathForRole } from "@/server/auth/types";

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user?.role) {
    redirect(homePathForRole(session.user.role));
  }

  return (
    <section className="mx-auto w-full max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-navy">
        Create an account
      </h1>
      <p className="mt-2 text-sm text-muted">
        Register as a customer or vendor. Administrator accounts are created
        separately.
      </p>
      <div className="mt-8 rounded-2xl border border-line bg-paper-strong p-6 shadow-sm">
        <RegisterForm />
      </div>
    </section>
  );
}
