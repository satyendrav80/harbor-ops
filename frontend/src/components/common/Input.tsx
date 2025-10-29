/* Purpose: Accessible input with label + helper text */
import { InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string | null;
  wrapperClassName?: string;
};

export default function Input({ id, label, hint, error, wrapperClassName = '', className = '', ...rest }: Props) {
  const inputId = id || rest.name || `input-${label.replace(/\s+/g, '-')}`;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className={wrapperClassName}>
      <label htmlFor={inputId} className="label">{label}</label>
      <input
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={`input ${className}`.trim()}
        {...rest}
      />
      {hint && !error && <p id={`${inputId}-hint`} className="text-xs text-slate-400 mt-1">{hint}</p>}
      {error && <p id={`${inputId}-error`} className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
