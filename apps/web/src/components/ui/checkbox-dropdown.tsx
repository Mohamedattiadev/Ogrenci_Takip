'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxOption {
  value: string;
  label: string;
}

interface CheckboxDropdownProps {
  id: string;
  label: string;
  options: CheckboxOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  hint?: string;
}

/**
 * Cok secenekli ama az yer kaplamasi gereken filtreler icin: kapaliyken tek satirlik bir
 * SelectField gibi durur, acilinca onay kutulu bir liste gosterir (Field/select-field.tsx ile
 * ayni gorsel dil). Topbar'daki kullanici menusuyle ayni disari-tiklayinca-kapan deseni.
 */
export function CheckboxDropdown({
  id,
  label,
  options,
  selected,
  onChange,
  placeholder = 'Seçin',
  hint,
}: CheckboxDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  const summary =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? placeholder)
        : `${selected.length} seçenek seçildi`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}
      </label>
      <div ref={rootRef} className="relative">
        <button
          id={id}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            'flex h-11 w-full items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 text-left text-sm',
            selected.length ? 'text-neutral-800 dark:text-neutral-100' : 'text-neutral-400',
            'focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100',
            'dark:border-neutral-700 dark:bg-neutral-800 dark:focus:ring-brand-900/40',
          )}
        >
          <span className="truncate">{summary}</span>
          <ChevronDown size={16} className="shrink-0 text-neutral-400" />
        </button>
        {open ? (
          <div
            role="listbox"
            aria-multiselectable
            className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
          >
            {options.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2.5 px-3.5 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-white/5"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option.value)}
                  onChange={() => toggle(option.value)}
                  className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-600 dark:bg-neutral-800"
                />
                {option.label}
              </label>
            ))}
          </div>
        ) : null}
      </div>
      {hint ? <p className="text-xs text-neutral-500 dark:text-neutral-400">{hint}</p> : null}
    </div>
  );
}
