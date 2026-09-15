import type { Metadata } from 'next';
import { ChangePasswordForm } from '@/components/auth/change-password-form';
import { AuthGuard } from '@/components/auth/auth-guard';

export const metadata: Metadata = { title: 'Şifre Değiştir · Öğrenci Takip Sistemi' };

export default function ChangePasswordPage() {
  return (
    <main className="flex min-h-full items-center justify-center bg-surface-background px-4 py-10">
      <AuthGuard />
      <ChangePasswordForm />
    </main>
  );
}
