import type { Metadata } from 'next';
import { TdvMark } from '@/components/brand/tdv-mark';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Giriş Yap · Öğrenci Takip Sistemi',
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-900 px-4 py-12">
      {/* Arka plan: dev, sonuk TDV amblemi - sag alta tasarak, kimligi hissettiren bir doku olarak */}
      <TdvMark
        aria-hidden
        className="pointer-events-none absolute -right-40 -bottom-56 h-[1100px] w-[1100px] text-white/[0.05] sm:-right-32 sm:-bottom-64 sm:h-[1300px] sm:w-[1300px]"
      />
      {/* Ikinci, kucuk ve tersten bir yansima - sol ustte, kompozisyona denge katmak icin */}
      <TdvMark
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 h-[420px] w-[420px] text-accent-500/[0.06]"
      />

      <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl shadow-2xl shadow-black/40 ring-1 ring-white/10">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Sol kart: kurumsal kimlik */}
          <div className="relative flex flex-col items-center justify-center gap-6 overflow-hidden bg-gradient-to-br from-brand-800 via-brand-900 to-[#0a1838] px-10 py-16 text-center">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                background:
                  'radial-gradient(circle at 30% 20%, var(--color-accent-500) 0%, transparent 55%)',
              }}
            />
            <TdvMark className="relative h-24 w-24 text-white drop-shadow-lg" />
            <div className="relative flex flex-col items-center gap-2">
              <p className="font-display text-xl leading-tight font-bold tracking-wide text-white">
                TÜRKİYE
                <br />
                DİYANET VAKFI
              </p>
              <span className="h-px w-10 bg-accent-500" />
              <p className="text-sm font-medium text-accent-200">Öğrenci Takip Sistemi</p>
            </div>
            <p className="relative max-w-[26ch] text-xs leading-relaxed text-white/50">
              Yurt ve kurumlarda verilen takviye derslerinin yoklama ve devam takibi
            </p>
          </div>

          {/* Sag kart: giris formu */}
          <div className="flex flex-col justify-center gap-7 bg-white px-8 py-12 sm:px-12">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-[0.14em] text-accent-600 uppercase">
                Hoş geldiniz
              </span>
              <h1 className="font-display text-2xl font-bold text-brand-900">Giriş Yap</h1>
              <p className="text-sm text-neutral-500">
                Hesabınıza erişmek için e-posta ve şifrenizi girin.
              </p>
            </div>
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
