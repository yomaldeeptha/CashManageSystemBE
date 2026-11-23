import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePettyCashRequestDto {
  @IsOptional()
  @IsString()
  requestId?: string;

  @IsOptional()
  @IsString()
  requestDate?: string;

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

  @Type(() => Number)
  @IsInt()
  departmentId!: number;

  @Type(() => Number)
  @IsInt()
  requestedById!: number;

  @IsOptional()
  @IsString()
  requesterTitle?: string;

  @Type(() => Number)
  @IsInt()
  expenseCategoryId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  currencyId?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  requestAmount!: number;

  @IsString()
  @IsNotEmpty()
  purpose!: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsIn(['Draft', 'Submitted'])
  status?: 'Draft' | 'Submitted';
}

export class CreatePettyCashAdvanceDto {
  @IsOptional()
  @IsString()
  docNo?: string;

  @IsOptional()
  @IsString()
  docDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  requestId?: number;

  @IsOptional()
  @IsString()
  reqNoDate?: string;

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
  expenseCategoryId?: number;

  @IsOptional()
  @IsString()
  expenseCategory?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  requesterId?: number;

  @IsString()
  @IsNotEmpty()
  requester!: string;

  @IsOptional()
  @IsString()
  employeeNo?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  requestedAmount!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  approvedAmount?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amountPaid!: number;

  @IsOptional()
  @IsString()
  paymentType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  floatAccountId?: number;

  @IsOptional()
  @IsString()
  bankOrCash?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  amountInWords?: string;

  @IsOptional()
  @IsString()
  narration?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class BillExpenseLineInputDto {
  @IsOptional()
  @IsString()
  billDate?: string;

  @IsString()
  @IsNotEmpty()
  billNo!: string;

  @IsString()
  @IsNotEmpty()
  supplier!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  expenseCategoryId?: number;

  @IsOptional()
  @IsString()
  expenseCategory?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsOptional()
  @IsString()
  attachmentName?: string;
}

export class BillAdjustmentInputDto {
  @IsString()
  @IsNotEmpty()
  paymentNo!: string;

  @IsOptional()
  @IsString()
  paymentDate?: string;

  @Type(() => Number)
  @IsNumber()
  balanceAmount = 0;

  @Type(() => Number)
  @IsNumber()
  adjustedAmount = 0;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class CreateBillSubmissionDto {
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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  outletId?: number;

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
  employeeId?: number;

  @IsString()
  @IsNotEmpty()
  employeeName!: string;

  @IsOptional()
  @IsString()
  employeeNo?: string;

  @IsIn(['Advance Settlement Direct', 'Direct'])
  submissionType: 'Advance Settlement Direct' | 'Direct' = 'Advance Settlement Direct';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  requestId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  advanceId?: number;

  @IsOptional()
  @IsString()
  pettyVoucherNo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalAdvanceBalance?: number;

  @IsOptional()
  @IsString()
  approverRemark?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillExpenseLineInputDto)
  expenseItems!: BillExpenseLineInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillAdjustmentInputDto)
  adjustments?: BillAdjustmentInputDto[];
}

export class CreatePettyCashReturnDto {
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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  outletId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  requestId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  advanceId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  billSubmissionId?: number;

  @IsOptional()
  @IsString()
  pettyCashVoucherNo?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsString()
  @IsNotEmpty()
  requester!: string;

  @IsOptional()
  @IsString()
  employeeNo?: string;

  @IsOptional()
  @IsString()
  receivedBy?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  advanceAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  settledAmount?: number;

  @IsIn(['Cash', 'Bank', 'Cash Handover', 'Bank Deposit'])
  receiptType = 'Cash';

  @IsOptional()
  @IsString()
  bankOrCash?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  returnAmount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  amountInWords?: string;

  @IsOptional()
  @IsString()
  narration?: string;
}

export class FloatVoucherInputDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  billSubmissionId?: number;

  @IsOptional()
  @IsString()
  pcrNo?: string;

  @IsString()
  @IsNotEmpty()
  voucherNo!: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsString()
  @IsNotEmpty()
  emp!: string;

  @IsString()
  @IsNotEmpty()
  expense!: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;
}

export class CreateFloatReimbursementDto {
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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  outletId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  floatAccountId?: number;

  @IsString()
  @IsNotEmpty()
  floatAccountName!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  floatAmount!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  settledAmount = 0;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  balanceCashInHand = 0;

  @IsOptional()
  @IsString()
  narration?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FloatVoucherInputDto)
  vouchers?: FloatVoucherInputDto[];
}
