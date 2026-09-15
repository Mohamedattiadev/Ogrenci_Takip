import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@yoklama/db';
import type { Request, Response } from 'express';

interface Described {
  status: number;
  message: string | string[];
  details?: unknown;
}

// Prisma, tetikleyici/RLS hatalarini metin icinde tasir: `code: "23514", message: "..."`.
const PG_CODE = /code: \\?"(\w{5})\\?"|Code: `(\w{5})`/;
const PG_MESSAGE = /(?:message: \\?"|ERROR: )([^"\\\n`]+)/;

/**
 * Tum hatalari tek bicimde dondurur:
 * { statusCode, error, message, details?, path, timestamp }
 * Veritabani kural ihlalleri 500 yerine anlamli 4xx koduna cevrilir; baglanti bilgisi sizmaz.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ApiException');

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    const { status, message, details } = describe(exception);
    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? (exception.stack ?? exception.message) : exception,
      );
    }
    response.status(status).json({
      statusCode: status,
      error: HttpStatus[status] ?? 'Error',
      message,
      ...(details === undefined ? {} : { details }),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}

function describe(exception: unknown): Described {
  if (exception instanceof HttpException) {
    const body = exception.getResponse();
    const message =
      typeof body === 'string'
        ? body
        : ((body as { message?: string | string[] }).message ?? exception.message);
    return { status: exception.getStatus(), message };
  }

  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    switch (exception.code) {
      case 'P2025':
        return { status: HttpStatus.NOT_FOUND, message: 'Kayit bulunamadi' };
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          message: 'Bu bilgilerle bir kayit zaten var',
          details: exception.meta?.target,
        };
      case 'P2003':
        return {
          status: HttpStatus.CONFLICT,
          message: 'Iliskili kayit bulunamadi veya kayit baska kayitlarda kullaniliyor',
        };
    }
  }

  if (exception instanceof Prisma.PrismaClientValidationError) {
    return { status: HttpStatus.BAD_REQUEST, message: 'Gecersiz istek parametresi' };
  }

  const text = exception instanceof Error ? exception.message : String(exception);
  const codeMatch = PG_CODE.exec(text);
  const code = codeMatch?.[1] ?? codeMatch?.[2];
  const pgMessage = PG_MESSAGE.exec(text)?.[1]?.trim();

  if (code === '23514') {
    return { status: HttpStatus.UNPROCESSABLE_ENTITY, message: pgMessage ?? 'Veri kurali ihlali' };
  }
  if (code === '23505') {
    return { status: HttpStatus.CONFLICT, message: 'Bu bilgilerle bir kayit zaten var' };
  }
  if (code === '23503') {
    return { status: HttpStatus.CONFLICT, message: 'Kayit baska kayitlarda kullaniliyor' };
  }
  if (code === '42501' || text.includes('row-level security')) {
    return { status: HttpStatus.FORBIDDEN, message: 'Bu kayit uzerinde islem yetkiniz yok' };
  }
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Beklenmeyen bir sunucu hatasi olustu',
  };
}
