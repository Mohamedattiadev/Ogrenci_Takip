'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, LoaderCircle } from 'lucide-react';
import { Field } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { login, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login(email, password);
      const storage = remember ? window.localStorage : window.sessionStorage;
      storage.setItem('accessToken', result.accessToken);
      storage.setItem('refreshToken', result.refreshToken);
      storage.setItem('user', JSON.stringify(result.user));
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Beklenmeyen bir hata oluştu.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <Field
        id="email"
        label="E-posta adresi"
        type="email"
        autoComplete="username"
        placeholder="ornek@tdv.org"
        icon={<Mail size={17} strokeWidth={1.75} />}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <Field
        id="password"
        label="Şifre"
        type={showPassword ? 'text' : 'password'}
        autoComplete="current-password"
        placeholder="••••••••"
        icon={<Lock size={17} strokeWidth={1.75} />}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        endAdornment={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="text-neutral-400 hover:text-neutral-600"
            aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
          >
            {showPassword ? (
              <EyeOff size={17} strokeWidth={1.75} />
            ) : (
              <Eye size={17} strokeWidth={1.75} />
            )}
          </button>
        }
      />

      <div className="-mt-3 flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-neutral-600">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-brand-700 focus:ring-brand-400"
          />
          Beni hatırla
        </label>
        <button
          type="button"
          title="Yakında kullanıma açılacak"
          className="cursor-not-allowed font-medium text-neutral-400"
        >
          Şifremi unuttum
        </button>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-status-danger"
        >
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={loading}
        className={cn('mt-1 w-full', loading && 'opacity-80')}
      >
        {loading ? (
          <>
            <LoaderCircle size={17} className="animate-spin" />
            Giriş yapılıyor…
          </>
        ) : (
          'Giriş Yap'
        )}
      </Button>
    </form>
  );
}
