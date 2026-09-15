'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { CheckCircle2, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { ApiError } from '@/lib/api';

interface FormShellProps {
  title: string;
  description?: string;
  submitLabel: string;
  onClose: () => void;
  /**
   * Kaydeder. Bir metin dondururse kayit yapilmis ama kullanicinin bilmesi gereken
   * bir durum vardir (ör. gruba eklenemedi): pencere acik kalir ve mesaj gosterilir.
   */
  onSubmit: () => Promise<string | void>;
  children: ReactNode;
}

export function FormShell({
  title,
  description,
  submitLabel,
  onClose,
  onSubmit,
  children,
}: FormShellProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const message = await onSubmit();
      if (message) setNotice(message);
      else onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kaydedilemedi, lütfen tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={title} description={description} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <fieldset
          disabled={busy || Boolean(notice)}
          className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto px-5 py-4 sm:grid-cols-2"
        >
          {children}
        </fieldset>
        <div className="flex flex-col gap-3 border-t border-neutral-100 px-5 py-4 dark:border-neutral-800">
          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-status-danger dark:border-red-900/50 dark:bg-red-950/40"
            >
              {error}
            </p>
          ) : null}
          {notice ? (
            <p
              role="status"
              className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"
            >
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              {notice}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {notice ? 'Kapat' : 'Vazgeç'}
            </Button>
            {notice ? null : (
              <Button type="submit" disabled={busy}>
                {busy ? <LoaderCircle size={16} className="animate-spin" /> : null}
                {busy ? 'Kaydediliyor…' : submitLabel}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function FullWidth({ children }: { children: ReactNode }) {
  return <div className="sm:col-span-2">{children}</div>;
}
