export function DemoBanner({ children }: { children: string }) {
  return (
    <p
      role="note"
      className="rounded-xl border border-line bg-paper px-3 py-2 text-sm text-muted"
    >
      {children}
    </p>
  );
}
