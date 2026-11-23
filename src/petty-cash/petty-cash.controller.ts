import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PettyCashService } from './petty-cash.service';
import {
  CreateBillSubmissionDto,
  CreateFloatReimbursementDto,
  CreatePettyCashAdvanceDto,
  CreatePettyCashRequestDto,
  CreatePettyCashReturnDto,
  FloatVoucherInputDto,
} from './dto/petty-cash.dto';

@ApiTags('Process 02 — Petty Cash Management & IOU Aging')
@ApiBearerAuth('JWT-auth')
@Controller('petty-cash')
export class PettyCashController {
  constructor(private readonly service: PettyCashService) {}

  // ---- P1: Requests ----
  @Get('requests')
  @RequirePermission('pettyCash', 'read')
  @ApiOperation({ summary: 'List Petty Cash Requests with live department budgets' })
  listRequests(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') companyId?: string,
    @Query('outletId') outletId?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listRequests(user, {
      companyId: companyId ? Number(companyId) : undefined,
      outletId,
      category,
      status,
      search,
    });
  }

  @Post('requests')
  @RequirePermission('pettyCash', 'create')
  @ApiOperation({ summary: 'Create or submit a Petty Cash Request (P1)' })
  createRequest(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePettyCashRequestDto) {
    return this.service.createRequest(user, dto);
  }

  @Post('requests/:id/approve')
  @RequirePermission('pettyCash', 'approve')
  @ApiOperation({ summary: 'Approve a Petty Cash Request (supports partial approved amount)' })
  approveRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { approvedAmount?: number; comment?: string },
  ) {
    return this.service.approveRequest(user, id, body);
  }

  @Post('requests/:id/reject')
  @RequirePermission('pettyCash', 'approve')
  @ApiOperation({ summary: 'Reject a Petty Cash Request with mandatory reason' })
  rejectRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string; comment?: string },
  ) {
    return this.service.rejectRequest(user, id, body);
  }

  @Post('requests/:id/cancel')
  @RequirePermission('pettyCash', 'update')
  @ApiOperation({ summary: 'Cancel a Petty Cash Request with mandatory audit trail' })
  cancelRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body?: { reason?: string },
  ) {
    return this.service.cancelRequest(user, id, body?.reason);
  }

  // ---- P2: Advances ----
  @Get('advances')
  @RequirePermission('pettyCash', 'read')
  @ApiOperation({ summary: 'List Petty Cash Payment & Advance Vouchers (role-masked approved amount)' })
  listAdvances(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') companyId?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listAdvances(user, {
      companyId: companyId ? Number(companyId) : undefined,
      category,
      search,
    });
  }

  @Post('advances')
  @RequirePermission('pettyCash', 'create')
  @ApiOperation({ summary: 'Disburse a Petty Cash Advance Voucher and update float, budget, and IOU atomically' })
  createAdvance(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePettyCashAdvanceDto) {
    return this.service.createAdvance(user, dto);
  }

  // ---- P3: Bill Submissions ----
  @Get('bill-submissions')
  @RequirePermission('pettyCash', 'read')
  @ApiOperation({ summary: 'List Petty Cash Bill Submissions & Expense Settlements' })
  listBills(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') companyId?: string,
    @Query('submissionType') submissionType?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listBillSubmissions(user, {
      companyId: companyId ? Number(companyId) : undefined,
      submissionType,
      search,
    });
  }

  @Post('bill-submissions')
  @RequirePermission('pettyCash', 'create')
  @ApiOperation({ summary: 'Submit supplier bills with server-side FX conversion and GST computation' })
  createBill(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBillSubmissionDto) {
    return this.service.createBillSubmission(user, dto);
  }

  @Post('bill-submissions/:id/verify')
  @RequirePermission('pettyCash', 'approve')
  @ApiOperation({ summary: 'Verify and settle (or reject) a Petty Cash Bill Submission' })
  verifyBill(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { decision?: 'approve' | 'reject'; remark?: string },
  ) {
    return this.service.verifyBillSubmission(user, id, body);
  }

  @Post('bill-submissions/:id/notify-cashier')
  @RequirePermission('pettyCash', 'update')
  @ApiOperation({ summary: 'Send a real operational alert to treasury cashier for a bill submission' })
  notifyCashier(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.notifyCashierForBill(user, id);
  }

  // ---- Step 4: Return Receipts ----
  @Get('returns')
  @RequirePermission('pettyCash', 'read')
  @ApiOperation({ summary: 'List Employee Unspent Advance Return Receipts' })
  listReturns(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') companyId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listReturns(user, {
      companyId: companyId ? Number(companyId) : undefined,
      search,
    });
  }

  @Post('returns')
  @RequirePermission('pettyCash', 'create')
  @ApiOperation({ summary: 'Issue Return Receipt and credit float / reduce pending IOU balance atomically' })
  createReturn(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePettyCashReturnDto) {
    return this.service.createReturn(user, dto);
  }

  // ---- Step 5: Float Reimbursements ----
  @Get('reimbursements')
  @RequirePermission('pettyCash', 'read')
  @ApiOperation({ summary: 'List Float Account Reimbursement Claims' })
  listReimbursements(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listReimbursements(user);
  }

  @Post('reimbursements')
  @RequirePermission('pettyCash', 'create')
  @ApiOperation({ summary: 'Create a Float Reimbursement Claim with running voucher totals' })
  createReimbursement(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFloatReimbursementDto,
  ) {
    return this.service.createReimbursement(user, dto);
  }

  @Post('reimbursements/:id/vouchers')
  @RequirePermission('pettyCash', 'update')
  @ApiOperation({ summary: 'Append an individual verified voucher to a Float Reimbursement Claim' })
  addVoucher(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FloatVoucherInputDto,
  ) {
    return this.service.addReimbursementVoucher(user, id, dto);
  }

  @Post('reimbursements/:id/submit')
  @RequirePermission('pettyCash', 'update')
  @ApiOperation({ summary: 'Submit a Float Reimbursement Claim for Treasury Clearing' })
  submitReimbursement(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.submitReimbursement(user, id);
  }

  // ---- Step 6: IOU Aging Matrix ----
  @Get('iou-aging')
  @RequirePermission('pettyCash', 'read')
  @ApiOperation({ summary: 'Get live server-computed Employee Advance Outstanding (IOU) Aging Matrix' })
  getIouAging() {
    return this.service.getIouAging();
  }
}
