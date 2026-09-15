'use client';

import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Field } from '@/components/ui/field';
import { apiJson } from '@/lib/api';
import type { StudentAccount } from '@/lib/portal-types';
import type { Student } from '@/lib/types';
import { FormShell, FullWidth } from './form-shell';

function temporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPRSTUVYZabcdefghjkmnprstuvyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return `${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')}-${new Date().getFullYear()}`;
}

/**
 * Yonetici ogrenciye giris hesabi acar veya gecici sifre verir. Kullanici adi varsayilan
 * olarak ogrenci numarasidir; ogrenci ilk giriste sifresini degistirmek zorundadir.
 */
export function StudentAccountForm({
  student,
  onClose,
  onChanged,
}: {
  student: Student;
  onClose: () => void;
  onChanged: () => void;
}) {
  const account = student.account;
  const [username, setUsername] = useState(student.studentNumber.toLowerCase());
  const [password, setPassword] = useState(temporaryPassword);
  const [toggleActive, setToggleActive] = useState(false);

  async function submit() {
    if (!account) {
      const created = await apiJson<StudentAccount>(`students/${student.id}/account`, {
        method: 'POST',
        body: { username: username.trim().toLowerCase(), password },
      });
      onChanged();
      return `Hesap açıldı. Kullanıcı adı: ${created.username} · Geçici şifre: ${password} — öğrenciye iletin; ilk girişte kendi şifresini belirleyecek.`;
    }
    await apiJson<StudentAccount>(`students/${student.id}/account`, {
      method: 'PATCH',
      body: toggleActive ? { isActive: !account.isActive } : { password },
    });
    onChanged();
    return toggleActive
      ? `Hesap ${account.isActive ? 'kapatıldı; öğrenci giriş yapamaz' : 'yeniden açıldı'}.`
      : `Yeni geçici şifre: ${password} — öğrenciye iletin; ilk girişte değiştirecek.`;
  }

  return (
    <FormShell
      title={account ? 'Öğrenci Hesabı' : 'Öğrenci Hesabı Aç'}
      description={`${student.fullName} · ${student.studentNumber}`}
      submitLabel={
        account
          ? toggleActive
            ? account.isActive
              ? 'Hesabı Kapat'
              : 'Hesabı Aç'
            : 'Geçici Şifre Ver'
          : 'Hesap Aç'
      }
      onClose={onClose}
      onSubmit={submit}
    >
      {account ? (
        <FullWidth>
          <div className="rounded-lg bg-neutral-50 px-3 py-2 text-sm dark:bg-white/[0.03]">
            <p className="text-neutral-500 dark:text-neutral-400">
              Kullanıcı adı:{' '}
              <strong className="text-neutral-800 dark:text-neutral-100">{account.username}</strong>
            </p>
            <p className="text-neutral-500 dark:text-neutral-400">
              Durum: {account.isActive ? 'Aktif' : 'Kapalı'}
              {account.mustChangePassword ? ' · ilk girişte şifre değiştirecek' : ''}
            </p>
          </div>
        </FullWidth>
      ) : (
        <FullWidth>
          <Field
            id="account-username"
            label="Kullanıcı adı *"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={40}
            pattern="[a-zA-Z0-9._\-]{3,40}"
          />
        </FullWidth>
      )}
      {account ? (
        <FullWidth>
          <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={toggleActive}
              onChange={(e) => setToggleActive(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-600 dark:bg-neutral-800"
            />
            {account.isActive
              ? 'Şifre vermek yerine hesabı kapat'
              : 'Şifre vermek yerine hesabı yeniden aç'}
          </label>
        </FullWidth>
      ) : null}
      {!toggleActive ? (
        <FullWidth>
          <Field
            id="account-password"
            label="Geçici şifre *"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            icon={<KeyRound size={16} strokeWidth={1.75} />}
            endAdornment={
              <button
                type="button"
                onClick={() => setPassword(temporaryPassword())}
                className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-300"
              >
                Yenile
              </button>
            }
          />
        </FullWidth>
      ) : null}
    </FormShell>
  );
}
