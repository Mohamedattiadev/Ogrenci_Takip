import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Öğrenci Takip Sistemi',
  description: 'Türkiye Diyanet Vakfı yurt/kurum öğrenci yoklama takip sistemi',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="tr" suppressHydrationWarning className="h-full antialiased">
      <body className="h-full font-sans">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
