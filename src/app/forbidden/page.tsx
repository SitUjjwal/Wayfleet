import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <section className="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
      <p className="text-sm font-medium uppercase tracking-[0.16em] text-copper">
        403
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-navy">
        You cannot open this area
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Your account role does not include this resource.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex rounded-xl bg-navy px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-navy-deep"
      >
        Back to home
      </Link>
    </section>
  );
}
