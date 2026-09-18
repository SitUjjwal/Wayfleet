type SubmitButtonProps = {
  children: string;
  pending?: boolean;
};

export function SubmitButton({ children, pending = false }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex w-full items-center justify-center rounded-md bg-navy px-4 py-2.5 text-sm font-medium text-paper-strong transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}
