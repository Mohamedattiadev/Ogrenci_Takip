import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  id: string;
  label: string;
  options: SelectOption[];
  placeholder?: string;
  hint?: string;
}

/** Etiketli secim kutusu - Field ile ayni gorunum. */
export function SelectField({
  id,
  label,
  options,
  placeholder = 'Seçin',
  hint,
  className,
  ...props
}: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}
      </label>
      <select
        id={id}
        className={cn(
          'h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-800',
          'focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100',
          'disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400',
          'dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:ring-brand-900/40 dark:disabled:bg-neutral-800/60 dark:disabled:text-neutral-500',
          className,
        )}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? <p className="text-xs text-neutral-500 dark:text-neutral-400">{hint}</p> : null}
    </div>
  );
}
