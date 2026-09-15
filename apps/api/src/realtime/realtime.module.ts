import { Controller, Global, Module, Sse, type MessageEvent } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Observable } from 'rxjs';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { RealtimeService } from './realtime.service';

@ApiTags('events')
@ApiBearerAuth()
@Controller({ path: 'events', version: '1' })
export class RealtimeController {
  constructor(private readonly realtime: RealtimeService) {}

  /**
   * Server-Sent Events akisi (text/event-stream). Olay tipleri: submission.saved,
   * submission.removed, assignment.created/updated/removed, ping.
   * Authorization basligi gerektirir (fetch ile okunur).
   */
  @SkipThrottle()
  @Sse()
  stream(@CurrentUser() user: AuthenticatedUser): Observable<MessageEvent> {
    return this.realtime.streamFor(user);
  }
}

@Global()
@Module({
  controllers: [RealtimeController],
  providers: [RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
