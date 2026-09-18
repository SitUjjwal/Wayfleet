type FormErrorProps = {
  message?: string;
};

export function FormError({ message }: FormErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <p role="alert" className="rounded-xl border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}
