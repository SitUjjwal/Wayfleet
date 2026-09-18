import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-navy text-paper-strong shadow-sm hover:bg-navy-deep",
  secondary: "border border-line bg-paper-strong text-navy shadow-sm hover:bg-paper",
  ghost: "text-navy hover:bg-paper",
  danger: "border border-danger/30 text-danger hover:bg-danger/5",
};

export function buttonClassName(
  variant: ButtonVariant = "primary",
  extra = "",
): string {
  return [
    "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
    "disabled:cursor-not-allowed disabled:opacity-70",
    VARIANT[variant],
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={buttonClassName(variant, className)} {...props}>
      {children}
    </button>
  );
}

type ButtonLinkProps = {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
};

export function ButtonLink({
  href,
  variant = "primary",
  className = "",
  children,
}: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonClassName(variant, className)}>
      {children}
    </Link>
  );
}
