'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  // next-themes'in resolvedTheme'i ilk ISTEMCI render'inda (henuz hydration
  // bitmeden) beklenenin aksine ZATEN doldurulmus olabiliyor (localStorage'da
  // kayitli bir tema varsa) - bu, sunucunun (tema bilgisi olmadan) rendered
  // Moon ikonuyla istemcinin ilk render'da gosterdigi Sun ikonu arasinda
  // GERCEK bir hydration mismatch hatasina yol aciyor (denendi, dogrulandi).
  // Cozum: React'in kendi onerdigi standart desen - "mounted" olana kadar
  // sabit bir ikon goster, gercek ikonu SADECE hydration'dan sonraki bir
  // effect'te ac. Bu satir bilerek "setState in effect" - buradaki amac
  // harici bir sistemi (tarayici/localStorage) senkronize etmek, turetilmis
  // state degil.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Açık temaya geç' : 'Koyu temaya geç'}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100',
        'dark:text-neutral-400 dark:hover:bg-white/5',
        className,
      )}
    >
      {isDark ? <Sun size={17} strokeWidth={1.75} /> : <Moon size={17} strokeWidth={1.75} />}
    </button>
  );
}
