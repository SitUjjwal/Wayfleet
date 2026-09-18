import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
  as?: "article" | "section" | "div";
};

export function Card({ children, className = "", as: Tag = "div" }: CardProps) {
  return (
    <Tag
      className={`rounded-2xl border border-line bg-paper-strong p-5 shadow-sm ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}
