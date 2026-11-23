import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CashDepositCurrencyLineDto {
  @IsString()
  @IsNotEmpty()
  currency!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  exRate?: number;
}

export class CreateCashDepositDto {
  @IsOptional()
  @IsString()
  docNo?: string;

  @IsOptional()
  @IsString()
  docDate?: string;

  @IsOptional()
  @IsString()
  collectionDate?: string;

  @IsOptional()
  @IsString()
  collectionTime?: string;

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

  @Type(() => Number)
  @IsInt()
  cashierId!: number;

  @Type(() => Number)
  @IsInt()
  cashCollectorId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  paymentTypeId?: number;

  @IsString()
  @IsNotEmpty()
  envelopeNo!: string;

  @IsOptional()
  @IsString()
  receiveFrom?: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsIn(['Draft', 'Submitted', 'Handover Verified'])
  status?: 'Draft' | 'Submitted' | 'Handover Verified';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CashDepositCurrencyLineDto)
  currencies!: CashDepositCurrencyLineDto[];

  @IsOptional()
  @IsObject()
  denominations?: Record<string, Record<string, number>>;
}

export class CreateCashierPaymentDto {
  @IsOptional()
  @IsString()
  docNo?: string;

  @IsOptional()
  @IsString()
  docDate?: string;

  @IsOptional()
  @IsString()
  paymentVoucherNo?: string;

  @IsOptional()
  @IsString()
  paymentDate?: string;

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
  cashierId?: number;

  @IsOptional()
  @IsString()
  cashierName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  requesterId?: number;

  @IsOptional()
  @IsString()
  requester?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  vendorId?: number;

  @IsString()
  @IsNotEmpty()
  vendor!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  floatAccountId?: number;

  @IsOptional()
  @IsString()
  floatAccount?: string;

  @IsString()
  @IsNotEmpty()
  transactionCurrency!: string;

  @IsString()
  @IsNotEmpty()
  cashAdvanceType!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  receiptNumber?: string;

  @IsOptional()
  @IsString()
  narration?: string;

  @IsOptional()
  @IsObject()
  denominations?: Record<string, number>;

  @IsOptional()
  @IsString()
  approvalStatus?: string;
}

export class SettlementLineInputDto {
  @IsString()
  @IsNotEmpty()
  currency!: string;

  @Type(() => Number)
  @IsNumber()
  openingBalance = 0;

  @Type(() => Number)
  @IsNumber()
  collection = 0;

  @Type(() => Number)
  @IsNumber()
  cashOut = 0;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  closingBalance?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  transferAmount = 0;

  @IsOptional()
  @IsObject()
  denominations?: Record<string, number>;
}

export class CreateCashierSettlementDto {
  @IsOptional()
  @IsString()
  docNo?: string;

  @IsOptional()
  @IsString()
  docDate?: string;

  @IsString()
  @IsNotEmpty()
  fromDate!: string;

  @IsString()
  @IsNotEmpty()
  toDate!: string;

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

  @IsString()
  @IsNotEmpty()
  fromCashier!: string;

  @IsString()
  @IsNotEmpty()
  toCashier!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  floatAccountId?: number;

  @IsOptional()
  @IsString()
  floatAccountName?: string;

  @IsOptional()
  @IsString()
  narration?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettlementLineInputDto)
  lines!: SettlementLineInputDto[];
}

export class ReceiptLineInputDto {
  @IsString()
  @IsNotEmpty()
  currency!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  settlementAmount = 0;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  receiptAmount = 0;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsObject()
  denominations?: Record<string, number>;
}

export class CreateCollectionReceiptDto {
  @IsOptional()
  @IsString()
  docNo?: string;

  @IsOptional()
  @IsString()
  docDate?: string;

  @IsOptional()
  @IsString()
  receiptVoucherNo?: string;

  @IsOptional()
  @IsString()
  receiptDate?: string;

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
  settlementId?: number;

  @IsOptional()
  @IsString()
  settledDocNo?: string;

  @IsOptional()
  @IsString()
  settledDocDate?: string;

  @IsString()
  @IsNotEmpty()
  receivedFrom!: string;

  @IsOptional()
  @IsString()
  receiptType?: string;

  @IsOptional()
  @IsString()
  collectionAccount?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  bankAccountId?: number;

  @IsString()
  @IsNotEmpty()
  bankAccount!: string;

  @IsString()
  @IsNotEmpty()
  cashAccount!: string;

  @IsOptional()
  @IsString()
  narration?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiptLineInputDto)
  lines!: ReceiptLineInputDto[];
}

export class CreateMainCashierSettlementDto {
  @IsOptional()
  @IsString()
  docNo?: string;

  @IsOptional()
  @IsString()
  docDate?: string;

  @IsString()
  @IsNotEmpty()
  fromDate!: string;

  @IsString()
  @IsNotEmpty()
  toDate!: string;

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

  @IsString()
  @IsNotEmpty()
  fromCashier!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  toBankAccountId?: number;

  @IsString()
  @IsNotEmpty()
  toBank!: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  narration?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettlementLineInputDto)
  rows!: SettlementLineInputDto[];
}

export class CreateOutletBankDepositDto {
  @IsOptional()
  @IsString()
  docNo?: string;

  @IsOptional()
  @IsString()
  docDate?: string;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  @IsString()
  depositDate?: string;

  @Type(() => Number)
  @IsInt()
  companyId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  branchId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  outletId?: number;

  @IsString()
  @IsNotEmpty()
  depositBankRefNo!: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  bankAccountId?: number;

  @IsOptional()
  @IsString()
  depositAccount?: string;

  @IsIn(['bank', 'carry_forward'])
  processFlowDecision!: 'bank' | 'carry_forward';

  @IsOptional()
  @IsArray()
  cashDepositIds?: number[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalCollectionAmount?: number;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class ImportBankStatementRowDto {
  @IsString()
  @IsNotEmpty()
  depositBankRefNo!: string;

  @IsString()
  @IsNotEmpty()
  statementRef!: string;

  @IsString()
  @IsNotEmpty()
  statementDate!: string;

  @Type(() => Number)
  @IsNumber()
  statementAmount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  depositBank?: string;
}

export class ImportBankStatementDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportBankStatementRowDto)
  rows!: ImportBankStatementRowDto[];
}
