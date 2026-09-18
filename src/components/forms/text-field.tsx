type TextFieldProps = {
  id: string;
  name: string;
  label: string;
  type?: "text" | "email" | "password" | "number" | "search";
  autoComplete?: string;
  required?: boolean;
  error?: string;
  defaultValue?: string;
  min?: number | string;
  max?: number | string;
  inputMode?: "text" | "numeric" | "decimal" | "email" | "search";
};

export function TextField({
  id,
  name,
  label,
  type = "text",
  autoComplete,
  required,
  error,
  defaultValue,
  min,
  max,
  inputMode,
}: TextFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-navy">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        defaultValue={defaultValue}
        min={min}
        max={max}
        inputMode={inputMode}
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
