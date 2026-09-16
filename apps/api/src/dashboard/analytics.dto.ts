import { IsDateString, IsIn, IsOptional, IsUUID, Matches } from 'class-validator';
import { PageQueryDto } from '../common/pagination';
import { CATEGORIES, type Category } from './analytics';

export class AnalyticsQueryDto extends PageQueryDto {
  @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) from?: string;
  @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) to?: string;
  @IsOptional() @IsUUID() institutionId?: string;
}
export class AnalyticsDetailDto extends AnalyticsQueryDto {
  @IsOptional() @IsIn(['all', ...CATEGORIES]) category: Category | 'all' = 'all';
  @IsOptional() @IsUUID() groupId?: string;
  @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) date?: string;
}
