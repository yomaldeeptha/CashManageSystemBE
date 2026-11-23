import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SaveNumberSeriesDto {
  @IsOptional()
  @IsString()
  seriesId?: string;

  @IsString()
  @IsNotEmpty()
  seriesName!: string;

  @IsString()
  @IsNotEmpty()
  formId!: string;

  @IsString()
  @IsNotEmpty()
  prefix!: string;

  @IsOptional()
  @IsString()
  suffix?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  initialNumber?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  nextNumber!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lastNumber?: number;

  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(8)
  numDigits!: number;

  @IsOptional()
  @IsString()
  periodIndicator?: string;

  @IsOptional()
  @IsString()
  branch?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  branchId?: number | null;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;
}

export class SaveFormMasterDto {
  @IsString()
  @IsNotEmpty()
  formId!: string;

  @IsString()
  @IsNotEmpty()
  formName!: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsString()
  @IsNotEmpty()
  module!: string;

  @IsOptional()
  @IsString()
  screenId?: string;

  @IsOptional()
  @IsString()
  routeKey?: string;

  @IsString()
  @IsNotEmpty()
  defaultPrefix!: string;

  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(8)
  defaultNumDigits!: number;

  @IsOptional()
  @IsBoolean()
  isTransactional?: boolean;

  @IsOptional()
  @IsString()
  makerCheckerType?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
