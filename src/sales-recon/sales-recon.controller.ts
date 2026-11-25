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
import { SalesReconService } from './sales-recon.service';
import {
  CreateSalesReconDto,
  ImportSalesReconBatchDto,
  UnblockSalesReconDto,
} from './dto/sales-recon.dto';

@ApiTags('Process 03 — Sales Day-End Reconciliation')
@ApiBearerAuth('JWT-auth')
@Controller('sales-recon')
export class SalesReconController {
  constructor(private readonly service: SalesReconService) {}

  @Get()
  @RequirePermission('salesRecon', 'read')
  @ApiOperation({ summary: 'List Sales Day-End Reconciliations (scoped to user entities)' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') companyId?: string,
    @Query('outletId') outletId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user, {
      companyId: companyId ? Number(companyId) : undefined,
      outletId,
      status,
      search,
    });
  }

  @Get('process01-envelopes')
  @RequirePermission('salesRecon', 'read')
  @ApiOperation({ summary: 'List live Process 01 Cash Deposits eligible for Sales Recon cash auto-fill' })
  getEnvelopes(
    @CurrentUser() user: AuthenticatedUser,
    @Query('outletId') outletId?: string,
  ) {
    return this.service.getProcess01Envelopes(user, outletId ? Number(outletId) : undefined);
  }

  @Get('variance-incidents')
  @RequirePermission('salesRecon', 'read')
  @ApiOperation({ summary: 'List Sales Reconciliation Variance Incidents (scoped to user entities)' })
  listVarianceIncidents(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') companyId?: string,
    @Query('outletId') outletId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.listVarianceIncidents(user, {
      companyId: companyId ? Number(companyId) : undefined,
      outletId,
      status,
    });
  }

  @Patch('variance-incidents/:id')
  @RequirePermission('salesRecon', 'approve')
  @ApiOperation({ summary: 'Update or resolve a Sales Reconciliation Variance Incident' })
  resolveVarianceIncident(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { auditStatus?: string; checkerAction?: string; recoveryMode?: string; cashierExplanation?: string },
  ) {
    return this.service.updateVarianceIncident(user, id, body);
  }

  @Get(':id')
  @RequirePermission('salesRecon', 'read')
  @ApiOperation({ summary: 'Get single Sales Reconciliation with shift tender lines and audit trail' })
  getOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.getOne(user, id);
  }

  @Post()
  @RequirePermission('salesRecon', 'create')
  @ApiOperation({ summary: 'Create a Sales Day-End Reconciliation with server-side variance calculation' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSalesReconDto) {
    return this.service.save(user, dto);
  }

  @Patch(':id')
  @RequirePermission('salesRecon', 'update')
  @ApiOperation({ summary: 'Update an unlocked Sales Day-End Reconciliation' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSalesReconDto,
  ) {
    return this.service.save(user, dto, id);
  }

  @Post(':id/sync-envelope')
  @RequirePermission('salesRecon', 'update')
  @ApiOperation({ summary: 'Sync physical cash amount from a Process 01 Cash Collection slip' })
  syncEnvelope(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { cashDepositId: number },
  ) {
    return this.service.syncEnvelope(user, id, Number(body.cashDepositId));
  }

  @Post('auto-reconcile-all')
  @RequirePermission('salesRecon', 'approve')
  @ApiOperation({ summary: 'Auto-reconcile all zero-variance shift records' })
  autoReconcileAll(@CurrentUser() user: AuthenticatedUser) {
    return this.service.autoReconcileAll(user);
  }

  @Post('import')
  @RequirePermission('salesRecon', 'create')
  @ApiOperation({ summary: 'Import a batch of POS tender rows into a new Sales Reconciliation' })
  importBatch(@CurrentUser() user: AuthenticatedUser, @Body() dto: ImportSalesReconBatchDto) {
    return this.service.importBatch(user, dto);
  }

  @Post(':id/approve')
  @RequirePermission('salesRecon', 'approve')
  @ApiOperation({ summary: 'Approve and certify a Sales Reconciliation' })
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { comment?: string },
  ) {
    return this.service.approve(user, id, body);
  }

  @Post(':id/reject')
  @RequirePermission('salesRecon', 'approve')
  @ApiOperation({ summary: 'Return/reject a Sales Reconciliation with mandatory reason' })
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string; comment?: string },
  ) {
    return this.service.reject(user, id, body);
  }

  @Post(':id/lock')
  @RequirePermission('salesRecon', 'approve')
  @ApiOperation({ summary: 'Enforce End-of-Day Period Lock on an Approved reconciliation' })
  lock(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.lockPeriod(user, id);
  }

  @Post(':id/unblock')
  @RequirePermission('salesRecon', 'unblock')
  @ApiOperation({ summary: 'Unblock a period-locked reconciliation (requires Document Unblocking Authority)' })
  unblock(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UnblockSalesReconDto,
  ) {
    return this.service.unblockPeriod(user, id, dto);
  }

  @Get(':id/final-report')
  @RequirePermission('salesRecon', 'read')
  @ApiOperation({ summary: 'Generate audited final report and balanced ERP G/L journal voucher' })
  finalReport(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.getFinalReport(user, id);
  }
}
