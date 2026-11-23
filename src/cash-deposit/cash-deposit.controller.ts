import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CashDepositService } from './cash-deposit.service';
import {
  CreateCashDepositDto,
  CreateCashierPaymentDto,
  CreateCashierSettlementDto,
  CreateCollectionReceiptDto,
  CreateMainCashierSettlementDto,
  CreateOutletBankDepositDto,
  ImportBankStatementDto,
} from './dto/cash-deposit.dto';
import { ApprovalDecisionDto } from '../approvals/dto/approvals.dto';

@ApiTags('Process 01 — Cash Collection & Treasury Handover')
@ApiBearerAuth('JWT-auth')
@Controller()
export class CashDepositController {
  constructor(private readonly service: CashDepositService) {}

  // ---- Screen 01: Outlet Cash Collection ----
  @Get('cash-deposits')
  @RequirePermission('cashDeposit', 'read')
  @ApiOperation({ summary: 'List Outlet Cash Collection slips (scoped & paginated)' })
  listDeposits(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') companyId?: string,
    @Query('outletId') outletId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listDeposits(user, {
      companyId: companyId ? Number(companyId) : undefined,
      outletId,
      status,
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 100,
    });
  }

  @Get('cash-deposits/:id')
  @RequirePermission('cashDeposit', 'read')
  @ApiOperation({ summary: 'Get a single Outlet Cash Collection slip with lines, denominations, and audit trail' })
  getDeposit(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.getDeposit(user, id);
  }

  @Post('cash-deposits')
  @RequirePermission('cashDeposit', 'create')
  @ApiOperation({ summary: 'Create a new Outlet Cash Collection slip with server-side FX calculation' })
  createDeposit(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCashDepositDto) {
    return this.service.createDeposit(user, dto);
  }

  @Post('cash-deposits/:id/submit')
  @RequirePermission('cashDeposit', 'update')
  @ApiOperation({ summary: 'Submit a Draft/Rejected Cash Collection slip into the multi-stage approval workflow' })
  submitDeposit(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.submitDeposit(user, id);
  }

  @Post('cash-deposits/:id/approve')
  @RequirePermission('cashDeposit', 'approve')
  @ApiOperation({ summary: 'Approve current approval stage of a Cash Collection slip' })
  approveDeposit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { comment?: string },
  ) {
    return this.service.decideDeposit(user, id, { decision: 'approve', comment: body?.comment });
  }

  @Post('cash-deposits/:id/reject')
  @RequirePermission('cashDeposit', 'approve')
  @ApiOperation({ summary: 'Return/reject a Cash Collection slip with mandatory reason' })
  rejectDeposit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string; comment?: string },
  ) {
    return this.service.decideDeposit(user, id, {
      decision: 'reject',
      comment: body?.reason || body?.comment,
    });
  }

  @Post('cash-deposits/:id/decide')
  @RequirePermission('cashDeposit', 'approve')
  decideDeposit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApprovalDecisionDto,
  ) {
    return this.service.decideDeposit(user, id, dto);
  }

  @Post('cash-deposits/:id/cancel')
  @RequirePermission('cashDeposit', 'update')
  @ApiOperation({ summary: 'Cancel a Draft/Submitted/Rejected Cash Collection slip with audit trail' })
  cancelDeposit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body?: { reason?: string },
  ) {
    return this.service.cancelDeposit(user, id, body?.reason);
  }

  @Post('cash-deposits/:id/post')
  @RequirePermission('cashDeposit', 'approve')
  @ApiOperation({ summary: 'Post an Approved Cash Collection slip to General Ledger' })
  postDeposit(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.postDeposit(user, id);
  }

  @Post('cash-deposits/:id/reverse')
  @RequirePermission('cashDeposit', 'unblock')
  @ApiOperation({ summary: 'Reverse a Posted Cash Collection slip with mandatory audit trail' })
  reverseDeposit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body?: { reason?: string },
  ) {
    return this.service.reverseDeposit(user, id, body?.reason);
  }

  // ---- Screen 02: Cashier Payment ----
  @Get('cash-deposit/payments')
  @RequirePermission('cashDeposit', 'read')
  @ApiOperation({ summary: 'List Cashier Payment / Spending Vouchers' })
  listPayments(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') companyId?: string,
    @Query('outletId') outletId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listCashierPayments(user, {
      companyId: companyId ? Number(companyId) : undefined,
      outletId,
      status,
      type,
      search,
    });
  }

  @Post('cash-deposit/payments')
  @RequirePermission('cashDeposit', 'create')
  @ApiOperation({ summary: 'Record Cashier Payment Voucher and deduct float balance atomically' })
  createPayment(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCashierPaymentDto) {
    return this.service.createCashierPayment(user, dto);
  }

  // ---- Screen 03 & 04: Cashier Settlement & Pending Queue ----
  @Get('cash-deposit/settlements')
  @RequirePermission('cashDeposit', 'read')
  @ApiOperation({ summary: 'List Cashier Settlements (pass pendingOnly=true for Screen 04 Queue)' })
  listSettlements(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') companyId?: string,
    @Query('outletId') outletId?: string,
    @Query('status') status?: string,
    @Query('pendingOnly') pendingOnly?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listSettlements(user, {
      companyId: companyId ? Number(companyId) : undefined,
      outletId,
      status,
      pendingOnly: pendingOnly === 'true',
      search,
    });
  }

  @Post('cash-deposit/settlements')
  @RequirePermission('cashDeposit', 'create')
  @ApiOperation({ summary: 'Create a Cashier Shift/Day-End Settlement' })
  createSettlement(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCashierSettlementDto,
  ) {
    return this.service.createSettlement(user, dto);
  }

  @Post('cash-deposit/settlements/:id/accept')
  @RequirePermission('cashDeposit', 'update')
  @ApiOperation({ summary: 'Accept and settle a pending Cashier Settlement from Screen 04 Queue' })
  acceptSettlement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.acceptSettlement(user, id);
  }

  // ---- Screen 05: Main Cash Collection Receipt ----
  @Get('cash-deposit/receipts')
  @RequirePermission('cashDeposit', 'read')
  @ApiOperation({ summary: 'List Main Cash Collection Official Receipts' })
  listReceipts(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') companyId?: string,
    @Query('outletId') outletId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listReceipts(user, {
      companyId: companyId ? Number(companyId) : undefined,
      outletId,
      search,
    });
  }

  @Post('cash-deposit/receipts')
  @RequirePermission('cashDeposit', 'create')
  @ApiOperation({ summary: 'Post a Main Cash Collection Official Receipt with server-calculated variance' })
  createReceipt(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCollectionReceiptDto,
  ) {
    return this.service.createReceipt(user, dto);
  }

  // ---- Screen 07: Main Cashier Payment ----
  @Get('cash-deposit/main-payments')
  @RequirePermission('cashDeposit', 'read')
  @ApiOperation({ summary: 'List Main Cashier Payments (Screen 07)' })
  listMainPayments(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') companyId?: string,
    @Query('outletId') outletId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listMainCashierPayments(user, {
      companyId: companyId ? Number(companyId) : undefined,
      outletId,
      search,
    });
  }

  @Post('cash-deposit/main-payments')
  @RequirePermission('cashDeposit', 'create')
  @ApiOperation({ summary: 'Create Main Cashier Payment (Screen 07)' })
  createMainPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCashierPaymentDto,
  ) {
    return this.service.saveMainCashierPayment(user, dto);
  }

  @Patch('cash-deposit/main-payments/:id')
  @RequirePermission('cashDeposit', 'update')
  @ApiOperation({ summary: 'Update Main Cashier Payment (Screen 07)' })
  updateMainPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCashierPaymentDto,
  ) {
    return this.service.saveMainCashierPayment(user, dto, id);
  }

  // ---- Screen 08: Main Cashier Settlement ----
  @Get('cash-deposit/main-settlements')
  @RequirePermission('cashDeposit', 'read')
  @ApiOperation({ summary: 'List Main Cashier Settlements to Bank (Screen 08)' })
  listMainSettlements(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') companyId?: string,
    @Query('outletId') outletId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listMainCashierSettlements(user, {
      companyId: companyId ? Number(companyId) : undefined,
      outletId,
      search,
    });
  }

  @Post('cash-deposit/main-settlements')
  @RequirePermission('cashDeposit', 'create')
  @ApiOperation({ summary: 'Submit Main Cashier Settlement (Screen 08)' })
  createMainSettlement(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMainCashierSettlementDto,
  ) {
    return this.service.saveMainCashierSettlement(user, dto);
  }

  @Patch('cash-deposit/main-settlements/:id')
  @RequirePermission('cashDeposit', 'update')
  @ApiOperation({ summary: 'Update Main Cashier Settlement (Screen 08)' })
  updateMainSettlement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateMainCashierSettlementDto,
  ) {
    return this.service.saveMainCashierSettlement(user, dto, id);
  }

  // ---- Screen 06: Outlet Bank Deposit ----
  @Get('cash-deposit/bank-deposits')
  @RequirePermission('cashDeposit', 'read')
  @ApiOperation({ summary: 'List Outlet-wise Cash Sale Bank Deposits' })
  listBankDeposits(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') companyId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listBankDeposits(user, {
      companyId: companyId ? Number(companyId) : undefined,
      search,
    });
  }

  @Post('cash-deposit/bank-deposits')
  @RequirePermission('cashDeposit', 'create')
  @ApiOperation({ summary: 'Post Outlet-wise Bank Deposit or Carry Forward decision with GL entries' })
  createBankDeposit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOutletBankDepositDto,
  ) {
    return this.service.createBankDeposit(user, dto);
  }

  // ---- Tab 9: Bank Reconciliation ----
  @Get('cash-deposit/bank-reconciliations')
  @RequirePermission('cashDeposit', 'read')
  @ApiOperation({ summary: 'List Outlet Bank Deposit Reconciliations' })
  listBankRecons(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listBankReconciliations(user);
  }

  @Post('cash-deposit/bank-reconciliations/import')
  @RequirePermission('cashDeposit', 'update')
  @ApiOperation({ summary: 'Import bank statement rows and auto-match against bank deposits' })
  importStatements(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ImportBankStatementDto,
  ) {
    return this.service.importBankStatements(user, dto);
  }
}
