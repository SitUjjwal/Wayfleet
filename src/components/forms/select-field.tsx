import type { ReactNode } from "react";

type SelectFieldProps = {
  id: string;
  name: string;
  label: string;
  required?: boolean;
  error?: string;
  defaultValue?: string;
  children: ReactNode;
};

export function SelectField({
  id,
  name,
  label,
  required,
  error,
  defaultValue,
  children,
}: SelectFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-navy">
        {label}
      </label>
      <select
        id={id}
        name={name}
        required={required}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="w-full rounded-md border border-line bg-paper-strong px-3 py-2 text-sm text-ink outline-none ring-navy focus:ring-2"
      >
        {children}
      </select>
      {error ? (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
