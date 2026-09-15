import { Injectable, type MessageEvent } from '@nestjs/common';
import { UserRole } from '@yoklama/db';
import { filter, interval, map, merge, Subject, type Observable } from 'rxjs';
import type { AuthenticatedUser } from '../auth/types';

export type RealtimeEventType =
  | 'submission.saved'
  | 'submission.removed'
  | 'assignment.created'
  | 'assignment.updated'
  | 'assignment.removed';

export interface RealtimeEvent {
  type: RealtimeEventType;
  /** Olayin ait oldugu yurt (yurt yoneticisi filtresi). */
  institutionId: string;
  /** Dersin hocasi (hoca filtresi). */
  teacherId: string;
  /** Olaydan haberdar olmasi gereken ogrenci kayitlari. */
  studentIds: string[];
  payload: Record<string, unknown>;
}

/**
 * Sayfa yenilemeden guncelleme icin sunucu olaylari (SSE). Her baglanti yalnizca
 * yetkisi dahilindeki olaylari alir; veri yine REST uclarindan (RLS altinda) okunur,
 * olay sadece "su degisti" bilgisini tasir.
 * Not: tek API sureci icin bellek ici yayin. Birden fazla surece olceklenirse
 * Postgres LISTEN/NOTIFY veya Redis pub/sub'a tasinmali.
 */
@Injectable()
export class RealtimeService {
  private readonly events = new Subject<RealtimeEvent>();

  publish(event: RealtimeEvent) {
    this.events.next(event);
  }

  streamFor(user: AuthenticatedUser): Observable<MessageEvent> {
    return merge(
      this.events.pipe(
        filter((event) => canReceive(user, event)),
        map((event) => ({ type: event.type, data: event.payload })),
      ),
      // Proxy/tarayici baglantiyi bosta kapatmasin.
      interval(25_000).pipe(map(() => ({ type: 'ping', data: {} }))),
    );
  }
}

function canReceive(user: AuthenticatedUser, event: RealtimeEvent): boolean {
  switch (user.role) {
    case UserRole.SUPER_ADMIN:
      return true;
    case UserRole.INSTITUTION_ADMIN:
      return user.institutionId === event.institutionId;
    case UserRole.TEACHER:
      return user.userId === event.teacherId;
    case UserRole.STUDENT:
      return Boolean(user.studentId) && event.studentIds.includes(user.studentId!);
    default:
      return false;
  }
}
