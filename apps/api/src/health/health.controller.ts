import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { prisma } from '@yoklama/db';
import { Public } from '../auth/public.decorator';

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  /** Yuk dengeleyici / izleme icin: API ayakta ve veritabanina ulasiyor mu. */
  @Public()
  @SkipThrottle()
  @Get()
  async check() {
    const started = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({ status: 'error', database: 'unreachable' });
    }
    return { status: 'ok', database: 'ok', latencyMs: Date.now() - started, time: new Date() };
  }
}
