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
import { Transform, Type } from 'class-transformer';

export class SalesReconLineInputDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  shiftId?: number;

  @Transform(({ value, obj }) => value ?? obj?.shiftName ?? 'Shift 1 - Morning')
  @IsString()
  @IsNotEmpty()
  shift!: string;

  @Transform(({ value, obj }) => value ?? obj?.cashierName ?? 'Outlet Cashier')
  @IsString()
  @IsNotEmpty()
  cashier!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  shiftTotalSales?: number;

  @Transform(({ value, obj }) => value ?? obj?.bankName ?? 'POS / Safe')
  @IsString()
  @IsNotEmpty()
  bank!: string;

  @Transform(({ value, obj }) => value ?? obj?.paymentTypeName ?? obj?.mode ?? 'Cash')
  @IsString()
  @IsNotEmpty()
  paymentType!: string;

  @Transform(({ value, obj }) => value ?? obj?.subTypeName ?? '')
  @IsOptional()
  @IsString()
  subType?: string;

  @Transform(({ value, obj }) => value ?? obj?.currencyCode ?? 'USD')
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

  @Transform(({ value, obj }) => value ?? obj?.returnsAmount ?? 0)
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
  docDate?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesReconLineInputDto)
  rows!: SalesReconLineInputDto[];
}
