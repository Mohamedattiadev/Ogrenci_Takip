'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}

/** Ortalanmis diyalog (mobilde alttan acilir). Esc veya arka plana tiklama kapatir. */
export function Modal({ title, description, onClose, children }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    panel.current?.querySelector<HTMLElement>('input, select, textarea')?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-950/40 sm:items-center sm:p-4 dark:bg-black/60"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl dark:bg-neutral-900 dark:ring-1 dark:ring-neutral-800"
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
          <div>
            <h2
              id="modal-title"
              className="font-display text-base font-bold text-neutral-900 dark:text-white"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-white/5 dark:hover:text-neutral-200"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
