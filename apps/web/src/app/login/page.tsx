import type { Metadata } from 'next';
import { TdvMark } from '@/components/brand/tdv-mark';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Giriş Yap · Öğrenci Takip Sistemi',
};

export default function LoginPage() {
  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      {/* Sol panel: kurumsal kimlik - tam yukseklik, kart/golge yok, sola
          yaslanmis (ortalanmis degil) bir "levha" duzeni: ust kose kucuk
          marka satiri, orta govde buyuk amblem+vakif adi, alt kose slogan. */}
      <div className="flex flex-col bg-brand-800 px-10 py-10 sm:px-16 lg:px-20 lg:py-14">
        <div className="flex shrink-0 items-center gap-2.5">
          <TdvMark className="h-7 w-7 text-mark-500" />
          <span className="text-xs font-semibold tracking-wide text-white/50 uppercase">
            Öğrenci Takip Sistemi
          </span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/60">
            v0.1
          </span>
        </div>

        {/* Ana kimlik bloğu: kalan alanda dikey ortalanir - sabit ust/alt
            satirlar arasinda "dengesiz bosluk" olusmasin diye justify-between
            yerine flex-1 + justify-center kullanildi. */}
        <div className="flex flex-1 flex-col justify-center gap-6">
          <TdvMark className="h-28 w-28 text-mark-500 drop-shadow-[0_4px_16px_rgba(0,0,0,0.3)]" />
          <div className="flex flex-col gap-3">
            <h1 className="font-display text-3xl leading-[1.1] font-bold text-white sm:text-4xl">
              Türkiye
              <br />
              Diyanet Vakfı
            </h1>
            <span className="h-px w-14 bg-accent-400" />
          </div>
        </div>

        <p className="max-w-[34ch] shrink-0 text-sm leading-relaxed text-white/45">
          Yurt ve kurumlarda verilen takviye derslerinin yoklama ve devam takibi
        </p>
      </div>

      {/* Sag panel: giris formu - tam yukseklik, dikey ortalanmis, sola
          yaslanmis bir sutun icinde (metin bloklari ortalanmis degil). */}
      <div className="relative flex items-center justify-center overflow-hidden bg-white px-8 py-12 sm:px-16">
        <TdvMark
          aria-hidden
          className="pointer-events-none absolute -right-24 -bottom-28 h-[460px] w-[460px] text-neutral-100 sm:-right-16 sm:-bottom-20"
        />
        <div className="relative flex w-full max-w-sm flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold tracking-[0.14em] text-accent-600 uppercase">
              Hoş geldiniz
            </span>
            <h2 className="font-display text-2xl font-bold text-brand-900">Giriş Yap</h2>
            <p className="text-sm text-neutral-500">
              Hesabınıza erişmek için e-posta ve şifrenizi girin.
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
