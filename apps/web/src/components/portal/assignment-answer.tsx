'use client';

import { useCallback, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Download, FileText, LoaderCircle, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApiError, apiFetch, downloadFile } from '@/lib/api';
import { useLiveEvents } from '@/lib/live';
import type { PortalAssignmentDetail } from '@/lib/portal-types';
import { formatBytes, formatDateTime } from '@/lib/portal-types';
import { useApi } from '@/lib/use-api';
import { Badge, Card, ErrorNote, Loading } from './ui';

export function AssignmentAnswer() {
  const { id } = useParams<{ id: string }>();
  const { data, error, reload } = useApi<PortalAssignmentDetail>(`portal/assignments/${id}`);

  useLiveEvents(
    useCallback(
      (event) => {
        if (event.type.startsWith('assignment.') && event.data.assignmentId === id) reload();
      },
      [id, reload],
    ),
  );

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard/my-assignments"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
      >
        <ArrowLeft size={15} /> Ödevlerim
      </Link>
      <ErrorNote message={error} />
      {!data ? (
        error ? null : (
          <Loading />
        )
      ) : (
        <>
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-neutral-900 dark:text-white">
                  {data.title}
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {data.course.name} · {data.group.name} · Hoca: {data.teacher?.name ?? '—'}
                </p>
              </div>
              <Badge tone={data.canSubmit ? 'warning' : 'danger'}>
                {data.dueAt ? `Son teslim ${formatDateTime(data.dueAt)}` : 'Süresiz'}
              </Badge>
            </div>
            {data.description ? (
              <p className="text-sm whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
                {data.description}
              </p>
            ) : null}
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              Kabul edilen cevap:{' '}
              {[data.allowText && 'metin', data.allowFile && 'PDF (en fazla 10 MB)']
                .filter(Boolean)
                .join(' ve ')}
            </p>
          </Card>
          {/* Kayit guncellenince form yeni degerlerle yeniden kurulur. */}
          <AnswerForm key={data.submission?.updatedAt ?? 'new'} detail={data} onSaved={reload} />
        </>
      )}
    </div>
  );
}

function AnswerForm({ detail, onSaved }: { detail: PortalAssignmentDetail; onSaved: () => void }) {
  const [text, setText] = useState(detail.submission?.text ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [removeFile, setRemoveFile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const submission = detail.submission;
  const locked = !detail.canSubmit;

  function pickFile(selected: File | null) {
    setError(null);
    if (selected && selected.type !== 'application/pdf') {
      setError('Sadece PDF dosyası yükleyebilirsiniz.');
      return;
    }
    if (selected && selected.size > detail.maxFileBytes) {
      setError('PDF en fazla 10 MB olabilir.');
      return;
    }
    setFile(selected);
    setRemoveFile(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    const form = new FormData();
    if (detail.allowText) form.append('text', text);
    if (file) form.append('file', file);
    if (removeFile) form.append('removeFile', 'true');
    setBusy(true);
    try {
      await apiFetch(`portal/assignments/${detail.id}/submission`, { method: 'PUT', body: form });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Cevap kaydedilemedi.');
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    if (!window.confirm('Cevabınız silinsin mi?')) return;
    setBusy(true);
    try {
      await apiFetch(`portal/assignments/${detail.id}/submission`, { method: 'DELETE' });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Cevap silinemedi.');
      setBusy(false);
    }
  }

  return (
    <Card
      title="Cevabım"
      action={
        submission ? (
          <Badge tone="success">Teslim edildi · {formatDateTime(submission.submittedAt)}</Badge>
        ) : (
          <Badge tone={locked ? 'danger' : 'warning'}>
            {locked ? 'Süresi geçti' : 'Henüz teslim edilmedi'}
          </Badge>
        )
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <fieldset disabled={locked || busy} className="flex flex-col gap-4">
          {detail.allowText ? (
            <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Metin cevap
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                maxLength={20000}
                placeholder="Cevabınızı buraya yazın…"
                className="rounded-lg border border-neutral-200 bg-white p-3 text-sm font-normal text-neutral-800 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:ring-brand-900/40"
              />
            </label>
          ) : null}

          {detail.allowFile ? (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                PDF dosyası
              </span>
              {submission?.file && !removeFile && !file ? (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-100 px-3 py-2 text-sm dark:border-neutral-800">
                  <FileText size={16} className="text-brand-700 dark:text-brand-300" />
                  <span className="font-medium text-neutral-800 dark:text-neutral-100">
                    {submission.file.name}
                  </span>
                  <span className="text-neutral-400">{formatBytes(submission.file.size)}</span>
                  <button
                    type="button"
                    onClick={() =>
                      void downloadFile(`portal/assignments/${detail.id}/submission/file`)
                    }
                    className="ml-auto inline-flex items-center gap-1 text-brand-700 hover:underline dark:text-brand-300"
                  >
                    <Download size={14} /> İndir
                  </button>
                  {!locked ? (
                    <button
                      type="button"
                      onClick={() => setRemoveFile(true)}
                      className="inline-flex items-center gap-1 text-status-danger hover:underline"
                    >
                      <Trash2 size={14} /> Kaldır
                    </button>
                  ) : null}
                </div>
              ) : null}
              {removeFile ? (
                <p className="text-sm text-status-danger">
                  Yüklü PDF kaydedince kaldırılacak.{' '}
                  <button type="button" onClick={() => setRemoveFile(false)} className="underline">
                    Vazgeç
                  </button>
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInput}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                />
                <Button type="button" variant="ghost" onClick={() => fileInput.current?.click()}>
                  <Upload size={16} />
                  {submission?.file ? 'Yeni PDF seç' : 'PDF seç'}
                </Button>
                {file ? (
                  <span className="text-sm text-neutral-600 dark:text-neutral-300">
                    {file.name} · {formatBytes(file.size)}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </fieldset>

        <ErrorNote message={error} />
        {saved ? (
          <p className="text-sm font-medium text-status-present">
            Cevabınız kaydedildi; hocanız hemen görebilir.
          </p>
        ) : null}

        {!locked ? (
          <div className="flex flex-wrap justify-end gap-2">
            {submission ? (
              <Button type="button" variant="ghost" onClick={() => void withdraw()} disabled={busy}>
                Cevabı sil
              </Button>
            ) : null}
            <Button type="submit" disabled={busy}>
              {busy ? <LoaderCircle size={16} className="animate-spin" /> : null}
              {submission ? 'Cevabı Güncelle' : 'Teslim Et'}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Teslim süresi dolduğu için cevap değiştirilemez.
          </p>
        )}
      </form>
    </Card>
  );
}
