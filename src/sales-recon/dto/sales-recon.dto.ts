import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SalesReconLineInputDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  shiftId?: number;

  @IsString()
  @IsNotEmpty()
  shift!: string;

  @IsString()
  @IsNotEmpty()
  cashier!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  shiftTotalSales?: number;

  @IsString()
  @IsNotEmpty()
  bank!: string;

  @IsString()
  @IsNotEmpty()
  paymentType!: string;

  @IsOptional()
  @IsString()
  subType?: string;

  @IsString()
  @IsNotEmpty()
  currency!: string;

  @Type(() => Number)
  @IsNumber()
  amount = 0;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  exRate?: number;

  @IsOptional()
  @IsString()
  diffType?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class CreateSalesReconDto {
  @IsOptional()
  @IsString()
  docNo?: string;

  @IsOptional()
  @IsString()
  docDate?: string;

  @Type(() => Number)
  @IsInt()
  companyId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  branchId?: number;

  @Type(() => Number)
  @IsInt()
  outletId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  shiftId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cashierId?: number;

  @IsOptional()
  @IsString()
  shiftStatus?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  posGrossSales = 0;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  returns = 0;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  rootCauseCategory?: string;

  @IsOptional()
  @IsString()
  overrideReason?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  linkedCashDepositId?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesReconLineInputDto)
  lines?: SalesReconLineInputDto[];
}

export class UnblockSalesReconDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class ImportSalesReconBatchDto {
  @Type(() => Number)
  @IsInt()
  companyId!: number;

  @Type(() => Number)
  @IsInt()
  outletId!: number;

  @IsOptional()
  @IsString()
  docDate?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesReconLineInputDto)
  rows!: SalesReconLineInputDto[];
}
