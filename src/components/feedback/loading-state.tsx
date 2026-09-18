export function LoadingState({ message = "Loading…" }: { message?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-dashed border-line bg-paper-strong px-4 py-10 text-center text-sm text-muted"
    >
      {message}
    </div>
  );
}
