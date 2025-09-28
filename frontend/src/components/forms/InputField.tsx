import { InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | null;
};

export default function InputField({ id, label, error, className, ...rest }: Props) {
  const inputId = id || rest.name || `input-${label}`;
  const describedBy = error ? `${inputId}-error` : undefined;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="block text-sm mb-1 text-slate-200">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
        {...rest}
      />
      {error && (
        <p id={describedBy} className="mt-1 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
