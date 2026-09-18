"use client";

import Link from "next/link";
import { useState } from "react";
import { signOutAction } from "@/features/auth/actions";

type NavbarUser = {
  name?: string | null;
  role?: string | null;
} | null;

function navFor(user: NavbarUser) {
  if (user?.role === "customer") {
    return [
      { href: "/customer", label: "Dashboard" },
      { href: "/vehicles", label: "Browse fleet" },
    ];
  }
  if (user?.role === "vendor") {
    return [
      { href: "/vendor", label: "Dashboard" },
      { href: "/vendor/vehicles", label: "Vehicles" },
    ];
  }
  if (user?.role === "admin") {
    return [{ href: "/admin", label: "Admin" }];
  }
  return [
    { href: "/#vehicles", label: "Vehicles" },
    { href: "/vehicles", label: "Browse fleet" },
    { href: "/#how-it-works", label: "How it works" },
  ];
}

export function Navbar({ user }: { user: NavbarUser }) {
  const [open, setOpen] = useState(false);
  const links = navFor(user);
  const home = user?.role ? `/${user.role}` : null;

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper-strong/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-navy to-copper text-sm font-semibold tracking-tight text-white shadow-sm">
            W
          </span>
          <span className="text-base font-semibold tracking-tight text-navy">
            Wayfleet
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted transition-colors hover:text-navy"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              {home ? (
                <Link href={home} className="max-w-[10rem] truncate text-sm font-medium text-navy">
                  {user.name ?? "Account"}
                </Link>
              ) : null}
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="rounded-xl border border-line px-3.5 py-2 text-sm font-medium text-navy hover:bg-paper"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-navy">
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-navy px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-navy-deep"
              >
                Register
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line text-navy md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <span className="flex flex-col gap-1.5" aria-hidden="true">
            <span className="block h-0.5 w-4 bg-current" />
            <span className="block h-0.5 w-4 bg-current" />
            <span className="block h-0.5 w-4 bg-current" />
          </span>
        </button>
      </div>

      {open ? (
        <div
          id="mobile-nav"
          className="border-t border-line bg-paper-strong px-4 py-4 md:hidden"
        >
          <nav className="flex flex-col gap-3" aria-label="Mobile">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="py-1 text-sm text-navy"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <form action={signOutAction}>
                <button type="submit" className="py-1 text-sm text-navy">
                  Sign out
                </button>
              </form>
            ) : (
              <>
                <Link href="/login" className="py-1 text-sm text-navy" onClick={() => setOpen(false)}>
                  Sign in
                </Link>
                <Link href="/register" className="py-1 text-sm text-navy" onClick={() => setOpen(false)}>
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
