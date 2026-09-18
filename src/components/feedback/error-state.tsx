export function ErrorState({
  title = "Something went wrong",
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-danger/30 bg-paper-strong px-4 py-10 text-center"
    >
      <p className="font-medium text-danger">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
          {description}
        </p>
      ) : null}
    </div>
  );
}
