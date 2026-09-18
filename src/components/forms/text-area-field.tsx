type TextAreaFieldProps = {
  id: string;
  name: string;
  label: string;
  required?: boolean;
  error?: string;
  defaultValue?: string;
  rows?: number;
};

export function TextAreaField({
  id,
  name,
  label,
  required,
  error,
  defaultValue,
  rows = 4,
}: TextAreaFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-navy">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        required={required}
        defaultValue={defaultValue}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="w-full rounded-md border border-line bg-paper-strong px-3 py-2 text-sm text-ink outline-none ring-navy focus:ring-2"
      />
      {error ? (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
