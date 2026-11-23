import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SaveScreenDto {
  @IsString()
  @IsNotEmpty()
  screenId!: string;

  @IsString()
  @IsNotEmpty()
  formId!: string;

  @IsString()
  @IsNotEmpty()
  screenName!: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsString()
  @IsNotEmpty()
  routeKey!: string;

  @IsOptional()
  @IsString()
  iconName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  makerCheckerType?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  supportedActions?: string[];

  @IsOptional()
  @IsString()
  defaultPrefix?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  defaultNumDigits?: number;

  @IsOptional()
  @IsBoolean()
  isTransactional?: boolean;
}

export class SaveUserScreenAuthDto {
  @IsObject()
  authorizations!: Record<
    string,
    {
      screenId?: string;
      formId?: string;
      canAccess: boolean;
      canCreate: boolean;
      canEdit: boolean;
      canApprove: boolean;
      canExport: boolean;
      authLevel: number;
    }
  >;
}

export class CopyScreenAuthDto {
  @Type(() => Number)
  @IsInt()
  sourceUserId!: number;

  @Type(() => Number)
  @IsInt()
  targetUserId!: number;
}
