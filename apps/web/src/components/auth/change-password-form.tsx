'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, LoaderCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { ApiError, changePassword, logout } from '@/lib/api';
import { useSessionUser } from '@/lib/session';

/** Ilk giriste zorunlu, sonrasinda istege bagli sifre degistirme. */
export function ChangePasswordForm() {
  const router = useRouter();
  const user = useSessionUser();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const forced = Boolean(user?.mustChangePassword);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (next.length < 8) return setError('Yeni şifre en az 8 karakter olmalı.');
    if (next !== repeat) return setError('Yeni şifreler birbiriyle eşleşmiyor.');
    if (next === current) return setError('Yeni şifre mevcut şifreden farklı olmalı.');
    setLoading(true);
    try {
      await changePassword(current, next);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Şifre değiştirilemedi.');
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-col gap-2">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-300">
          <KeyRound size={20} strokeWidth={1.75} />
        </span>
        <h1 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
          {forced ? 'Şifrenizi belirleyin' : 'Şifre değiştir'}
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {forced
            ? 'Hesabınız size verilen geçici şifreyle açıldı. Devam etmek için yalnızca sizin bileceğiniz yeni bir şifre belirleyin.'
            : 'Yeni şifreniz en az 8 karakter olmalı. Diğer cihazlardaki oturumlarınız kapanır.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field
          id="current-password"
          label={forced ? 'Geçici şifre' : 'Mevcut şifre'}
          type="password"
          autoComplete="current-password"
          icon={<Lock size={17} strokeWidth={1.75} />}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
        <Field
          id="new-password"
          label="Yeni şifre"
          type="password"
          autoComplete="new-password"
          icon={<Lock size={17} strokeWidth={1.75} />}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          minLength={8}
          required
        />
        <Field
          id="repeat-password"
          label="Yeni şifre (tekrar)"
          type="password"
          autoComplete="new-password"
          icon={<Lock size={17} strokeWidth={1.75} />}
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          minLength={8}
          required
        />
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-status-danger dark:border-red-900/50 dark:bg-red-950/40"
          >
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? <LoaderCircle size={17} className="animate-spin" /> : null}
          {loading ? 'Kaydediliyor…' : 'Şifreyi Kaydet'}
        </Button>
      </form>

      <div className="flex justify-between text-sm">
        {forced ? (
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.replace('/login');
            }}
            className="font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            Çıkış yap
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.back()}
            className="font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            Geri dön
          </button>
        )}
      </div>
    </div>
  );
}
