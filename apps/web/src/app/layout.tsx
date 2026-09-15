import type { Metadata } from 'next';
import { Manrope, Public_Sans } from 'next/font/google';
import './globals.css';

const publicSans = Public_Sans({
  variable: '--font-public-sans',
  subsets: ['latin'],
});

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Öğrenci Takip Sistemi',
  description: 'Türkiye Diyanet Vakfı yurt/kurum öğrenci yoklama takip sistemi',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="tr" className={`${publicSans.variable} ${manrope.variable} h-full antialiased`}>
      <body className="h-full font-sans">{children}</body>
    </html>
  );
}
