import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const CHANGE_LOG_ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'CANCEL',
  'APPROVE',
  'REJECT',
  'POST',
  'REVERSE',
  'CLOSE',
  'REOPEN',
  'STATUS_CHANGE',
] as const;

export type ChangeLogActionType = (typeof CHANGE_LOG_ACTIONS)[number];

export interface AuditActor {
  id?: number | null;
  fullName?: string;
  username?: string;
  empNo?: string | null;
}

export interface AuditRequestContext {
  userId?: number | null;
  userName?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  isSystem?: boolean;
}

export interface FieldChangeDiff {
  field: string;
  label: string;
  oldValue: unknown;
  newValue: unknown;
  changeType: 'ADDED' | 'MODIFIED' | 'REMOVED';
}

export interface BaseAuditLogParams {
  tableName: string;
  recordId: number | string;
  recordCode?: string | null;
  description?: string;
  actor?: AuditActor | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  tx?: Prisma.TransactionClient;
}

export interface LogCreateParams extends BaseAuditLogParams {
  newValues: Record<string, unknown> | object;
}

export interface LogUpdateParams extends BaseAuditLogParams {
  oldValues: Record<string, unknown> | object;
  newValues: Record<string, unknown> | object;
}

export interface LogDeleteParams extends BaseAuditLogParams {
  oldValues: Record<string, unknown> | object;
}

export interface LogActionParams extends BaseAuditLogParams {
  action: Exclude<ChangeLogActionType, 'CREATE' | 'UPDATE' | 'DELETE'>;
  oldValues?: Record<string, unknown> | object | null;
  newValues?: Record<string, unknown> | object | null;
  changedFields?: string[];
  description: string;
}

export interface BulkLogCreateParams {
  tableName: string;
  records: Array<{
    recordId: number | string;
    recordCode?: string | null;
    newValues: Record<string, unknown> | object;
    description?: string;
  }>;
  actor?: AuditActor | null;
  tx?: Prisma.TransactionClient;
}

export class AuditLogQueryDto {
  @ApiPropertyOptional({ description: 'Filter from UTC ISO date/datetime' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter to UTC ISO date/datetime' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by actor UserId' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @ApiPropertyOptional({ description: 'Filter by entity/table name (e.g. CashDeposit, Company)' })
  @IsOptional()
  @IsString()
  tableName?: string;

  @ApiPropertyOptional({ enum: CHANGE_LOG_ACTIONS })
  @IsOptional()
  @IsIn(CHANGE_LOG_ACTIONS)
  action?: ChangeLogActionType;

  @ApiPropertyOptional({ description: 'Search by human-readable record code or document number' })
  @IsOptional()
  @IsString()
  recordCode?: string;

  @ApiPropertyOptional({ description: 'Free-text search across code, description, user, table' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 25;

  @ApiPropertyOptional({ enum: ['createdAt', 'tableName', 'action', 'userName'] })
  @IsOptional()
  @IsIn(['createdAt', 'tableName', 'action', 'userName'])
  sortBy?: 'createdAt' | 'tableName' | 'action' | 'userName' = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
