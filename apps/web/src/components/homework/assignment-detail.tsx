'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Radio, Trash2 } from 'lucide-react';
import { Badge, Card, Empty, ErrorNote, Loading, Table, Td } from '@/components/portal/ui';
import { ApiError, apiFetch, downloadFile } from '@/lib/api';
import { useLiveEvents } from '@/lib/live';
import type { StaffAssignmentDetail } from '@/lib/portal-types';
import { formatBytes, formatDateTime } from '@/lib/portal-types';
import { useApi } from '@/lib/use-api';

export function AssignmentDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, error, reload } = useApi<StaffAssignmentDetail>(`assignments/${id}`);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastLive, setLastLive] = useState<string | null>(null);

  // Ogrenci cevap ekleyince/silince liste sayfa yenilemeden guncellenir.
  useLiveEvents(
    useCallback(
      (event) => {
        if (event.data.assignmentId !== id) return;
        if (event.type === 'submission.saved' && typeof event.data.studentName === 'string') {
          setLastLive(`${event.data.studentName} cevabını gönderdi`);
        }
        reload();
      },
      [id, reload],
    ),
  );

  async function remove() {
    if (
      !window.confirm(
        'Ödev silinsin mi? Öğrencilerin listesinden kalkar; gönderilen cevaplar saklanır.',
      )
    )
      return;
    try {
      await apiFetch(`assignments/${id}`, { method: 'DELETE' });
      router.push('/dashboard/assignments');
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Ödev silinemedi.');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard/assignments"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
      >
        <ArrowLeft size={15} /> Ödevler
      </Link>
      <ErrorNote message={error ?? actionError} />
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
                  {data.course.name} · {data.group.name} · {data.teacher?.name ?? '—'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={data.isOpen ? 'success' : 'neutral'}>
                  {data.dueAt ? `Son teslim ${formatDateTime(data.dueAt)}` : 'Süresiz'}
                </Badge>
                <button
                  type="button"
                  onClick={() => void remove()}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-status-danger hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  <Trash2 size={14} /> Sil
                </button>
              </div>
            </div>
            {data.description ? (
              <p className="text-sm whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
                {data.description}
              </p>
            ) : null}
          </Card>

          <Card
            title={`Teslimler · ${data.submittedCount} / ${data.students.length}`}
            action={
              <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                <Radio size={13} className="text-status-present" />
                {lastLive ?? 'Canlı güncelleniyor'}
              </span>
            }
          >
            {data.students.length === 0 ? (
              <Empty>Bu dersin grubunda öğrenci yok.</Empty>
            ) : (
              <Table head={['Öğrenci', 'Durum', 'Gönderim', 'Cevap']}>
                {data.students.map(({ student, submission }) => (
                  <tr key={student.id}>
                    <Td className="font-medium text-neutral-800 dark:text-neutral-100">
                      {student.fullName}
                      <span className="block text-xs font-normal text-neutral-400">
                        {student.studentNumber}
                      </span>
                    </Td>
                    <Td>
                      {submission ? (
                        <Badge tone="success">Teslim edildi</Badge>
                      ) : (
                        <Badge tone="warning">Bekleniyor</Badge>
                      )}
                    </Td>
                    <Td>{submission ? formatDateTime(submission.submittedAt) : '—'}</Td>
                    <Td className="max-w-md">
                      {submission?.file ? (
                        <button
                          type="button"
                          onClick={() =>
                            void downloadFile(`assignments/${id}/submissions/${student.id}/file`)
                          }
                          className="mb-1 inline-flex items-center gap-1 text-brand-700 hover:underline dark:text-brand-300"
                        >
                          <Download size={14} /> {submission.file.name}{' '}
                          {formatBytes(submission.file.size)}
                        </button>
                      ) : null}
                      {submission?.text ? (
                        <div>
                          <p
                            className={
                              expanded === student.id
                                ? 'whitespace-pre-wrap text-neutral-700 dark:text-neutral-300'
                                : 'line-clamp-2 text-neutral-700 dark:text-neutral-300'
                            }
                          >
                            {submission.text}
                          </p>
                          {submission.text.length > 120 ? (
                            <button
                              type="button"
                              onClick={() =>
                                setExpanded(expanded === student.id ? null : student.id)
                              }
                              className="text-xs text-brand-700 hover:underline dark:text-brand-300"
                            >
                              {expanded === student.id ? 'Daralt' : 'Tamamını göster'}
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                      {!submission ? '—' : null}
                    </Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
