import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Tum liste uc noktalarinin ortak sorgu parametreleri: ?page=1&pageSize=25&search=... */
export class PageQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 25, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 25;

  @ApiPropertyOptional({ description: 'Serbest metin arama' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Liste yaniti: { data: [...], meta: { page, pageSize, total, totalPages } } */
export interface Page<T> {
  data: T[];
  meta: PageMeta;
}

export function pageArgs(query: PageQueryDto) {
  return { skip: (query.page - 1) * query.pageSize, take: query.pageSize };
}

export function toPage<T>(data: T[], total: number, query: PageQueryDto): Page<T> {
  return {
    data,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  };
}

/** Prisma `contains` aramasi icin buyuk/kucuk harf duyarsiz filtre. */
export function contains(search: string) {
  return { contains: search.trim(), mode: 'insensitive' as const };
}
