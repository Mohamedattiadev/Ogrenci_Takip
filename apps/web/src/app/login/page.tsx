import type { Metadata } from 'next';
import Image from 'next/image';
import { TdvMark } from '@/components/brand/tdv-mark';
import { LoginForm } from '@/components/auth/login-form';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata: Metadata = {
  title: 'Giriş Yap · Öğrenci Takip Sistemi',
};

export default function LoginPage() {
  return (
    <div className="relative grid grid-cols-1 md:min-h-screen md:grid-cols-[clamp(21rem,30vw,26rem)_1fr]">
      <ThemeToggle className="absolute top-4 right-4 z-10 bg-white/80 backdrop-blur dark:bg-neutral-900/80" />
      {/* Sol panel: kurumsal kimlik. Masaustunde (md+) tam yukseklik "levha"
          duzeni (ust marka satiri, ortada dikey ortalanmis amblem+vakif adi,
          altta slogan). Dar/mobil genislikte panel artik tam ekran yukseklik
          DENEMEZ - flex-1+justify-center, grid'in oto-boyutlandirdigi (auto
          height) bir satirda ongorulemez bosluklar uretiyordu (olcum: 900px
          viewport'ta panel sadece 400px yukseklikte ama ortasinda dev bir
          bosluk vardi). Bu yuzden mobilde duz, kompakt bir "baslik" gibi
          davranir - sabit gap ile art arda, tam yukseklik hicbir zaman
          hedeflenmez. */}
      <div className="relative flex flex-col overflow-hidden bg-brand-900">
        {/* Arka plan: hazir illustrasyon (public/images/login-panel-bg.png) -
            lacivert->mavi dalga gecisleri + cok dusuk kontrastli cami
            silueti. Koyu temada ustune ince bir karartma katmani biniyor
            ki gorsel acik temayla birebir ayni gorunmesin. */}
        <Image
          src="/images/login-panel-bg.png"
          alt=""
          fill
          priority
          sizes="(min-width: 768px) 26rem, 100vw"
          className="object-cover"
        />
        <div className="pointer-events-none absolute inset-0 dark:bg-black/30" />

        <div className="relative z-10 flex flex-1 flex-col gap-10 px-10 py-10 sm:px-12 lg:py-14">
          <div className="flex items-center gap-2.5">
            <TdvMark className="h-7 w-7 text-mark-500" />
            <span className="text-xs font-semibold tracking-wide text-white/50 uppercase">
              Öğrenci Takip Sistemi
            </span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/60">
              v0.1
            </span>
          </div>

          <div className="flex flex-col gap-6 md:flex-1 md:justify-center">
            <TdvMark className="h-20 w-20 text-mark-500 drop-shadow-[0_4px_16px_rgba(0,0,0,0.3)] md:h-28 md:w-28" />
            <div className="flex flex-col gap-3">
              <h1 className="font-display text-3xl leading-[1.15] font-bold text-white">
                Türkiye
                <br />
                Diyanet Vakfı
              </h1>
              <span className="h-px w-14 bg-accent-400" />
            </div>
          </div>

          <p className="max-w-[34ch] text-sm leading-relaxed text-white/45">
            Yurt ve kurumlarda verilen takviye derslerinin yoklama ve devam takibi
          </p>
        </div>
      </div>

      {/* Sag panel: giris formu - tam yukseklik, dikey ortalanmis, sola
          yaslanmis bir sutun icinde (metin bloklari ortalanmis degil). */}
      <div className="relative flex items-center justify-center overflow-hidden bg-white px-8 py-12 sm:px-16 dark:bg-neutral-900">
        <TdvMark
          aria-hidden
          className="pointer-events-none absolute -right-24 -bottom-28 h-[460px] w-[460px] text-neutral-100 sm:-right-16 sm:-bottom-20 dark:text-white/[0.03]"
        />
        <div className="relative flex w-full max-w-sm flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold tracking-[0.14em] text-accent-600 uppercase dark:text-accent-400">
              Hoş geldiniz
            </span>
            <h2 className="font-display text-2xl font-bold text-brand-900 dark:text-white">
              Giriş Yap
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Hesabınıza erişmek için e-posta ve şifrenizi girin.
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
