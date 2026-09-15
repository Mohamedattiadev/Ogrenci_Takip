import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode;
  /** Sag tarafa yerlestirilen etkilesimli eleman (ör. sifre goster/gizle butonu). */
  endAdornment?: ReactNode;
  error?: string;
}

/** Etiket + ikon + input tek parca - login ve dashboard formlarinda ortak kullanilir. */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, icon, endAdornment, error, className, id, ...props },
  ref,
) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}
      </label>
      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-neutral-400">
            {icon}
          </span>
        ) : null}
        <input
          ref={ref}
          id={id}
          className={cn(
            'h-11 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-800',
            'placeholder:text-neutral-400',
            'transition-shadow focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100',
            'dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:ring-brand-900/40',
            'read-only:cursor-default read-only:bg-neutral-50 dark:read-only:bg-neutral-800/50',
            icon && 'pl-10',
            endAdornment && 'pr-10',
            error && 'border-status-danger focus:border-status-danger focus:ring-red-100',
            className,
          )}
          aria-invalid={!!error}
          {...props}
        />
        {endAdornment ? (
          <span className="absolute inset-y-0 right-3 flex items-center">{endAdornment}</span>
        ) : null}
      </div>
      {error ? <p className="text-xs font-medium text-status-danger">{error}</p> : null}
    </div>
  );
});
