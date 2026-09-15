import type { Metadata } from 'next';
import { Building2, Database, Download } from 'lucide-react';
import { Field } from '@/components/ui/field';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Ayarlar · Öğrenci Takip Sistemi' };

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <Icon size={18} strokeWidth={1.75} />
        </span>
        <div>
          <h3 className="font-display text-sm font-bold text-neutral-900">{title}</h3>
          <p className="mt-0.5 text-xs text-neutral-500">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl font-bold text-neutral-900">Ayarlar</h2>
        <p className="text-sm text-neutral-500">Kurum bilgileri, yedekleme ve veri yönetimi.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SettingsSection
          icon={Building2}
          title="Kurum Bilgileri"
          description="Merkez Yurt için genel bilgiler"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="inst-name" label="Kurum Adı" defaultValue="Merkez Yurt (Demo)" readOnly />
            <Field id="inst-code" label="Kurum Kodu" defaultValue="MERKEZ" readOnly />
          </div>
          <Button variant="ghost" className="w-fit self-end" disabled>
            Kaydet
          </Button>
        </SettingsSection>

        <SettingsSection
          icon={Database}
          title="Otomatik Yedekleme"
          description="Veritabanının düzenli olarak yedeklenmesi"
        >
          <div className="flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-neutral-700">Son yedekleme</p>
              <p className="text-xs text-neutral-400">Henüz yapılandırılmadı</p>
            </div>
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-500 uppercase">
              Yapım aşamasında
            </span>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={Download}
          title="Veri Dışa Aktarma"
          description="Tüm kurum verisini indirilebilir dosya olarak alın"
        >
          <div className="flex flex-wrap gap-2">
            {['Öğrenciler', 'Yoklama Kayıtları', 'Kullanıcılar'].map((item) => (
              <button
                key={item}
                type="button"
                disabled
                className="cursor-not-allowed rounded-lg border border-neutral-200 px-3.5 py-2 text-sm font-medium text-neutral-400"
              >
                {item} (CSV)
              </button>
            ))}
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
