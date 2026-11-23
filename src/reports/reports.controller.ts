import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ReportFilterQuery, ReportsService } from './reports.service';

@ApiTags('Financial Reports & Analytics (RPT-001 to RPT-006)')
@ApiBearerAuth('JWT-auth')
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  private parseQuery(
    dateRange?: string,
    fromDate?: string,
    toDate?: string,
    companyId?: string,
    outletId?: string,
    status?: string,
    search?: string,
  ): ReportFilterQuery {
    return {
      dateRange,
      fromDate,
      toDate,
      companyId: companyId ? Number(companyId) : undefined,
      outletId,
      status,
      search,
    };
  }

  @Get('hub')
  @RequirePermission('reports', 'read')
  @ApiOperation({ summary: 'Executive Reports Cockpit summary across all 6 reports' })
  getHub(
    @CurrentUser() user: AuthenticatedUser,
    @Query('dateRange') dateRange?: string,
    @Query('companyId') companyId?: string,
    @Query('outletId') outletId?: string,
  ) {
    return this.service.getHub(user, this.parseQuery(dateRange, undefined, undefined, companyId, outletId));
  }

  @Get('cash-banking')
  @RequirePermission('reports', 'read')
  @ApiOperation({ summary: 'RPT-001 Daily Cash Collection & Treasury Banking Report' })
  getCashBanking(
    @CurrentUser() user: AuthenticatedUser,
    @Query('dateRange') dateRange?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('companyId') companyId?: string,
    @Query('outletId') outletId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.service.getCashBankingReport(
      user,
      this.parseQuery(dateRange, fromDate, toDate, companyId, outletId, status, search),
    );
  }

  @Get('sales-tender')
  @RequirePermission('reports', 'read')
  @ApiOperation({ summary: 'RPT-002 Sales Tender & Channel Reconciliation Report' })
  getSalesTender(
    @CurrentUser() user: AuthenticatedUser,
    @Query('dateRange') dateRange?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('companyId') companyId?: string,
    @Query('outletId') outletId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.service.getSalesTenderReport(
      user,
      this.parseQuery(dateRange, fromDate, toDate, companyId, outletId, status, search),
    );
  }

  @Get('petty-iou')
  @RequirePermission('reports', 'read')
  @ApiOperation({ summary: 'RPT-003 Petty Cash Float & IOU Aging Analysis Report' })
  getPettyIou(
    @CurrentUser() user: AuthenticatedUser,
    @Query('dateRange') dateRange?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('companyId') companyId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.service.getPettyIouReport(
      user,
      this.parseQuery(dateRange, fromDate, toDate, companyId, undefined, status, search),
    );
  }

  @Get('variance-audit')
  @RequirePermission('reports', 'read')
  @ApiOperation({ summary: 'RPT-004 Cash Over / Short & Discrepancy Exception Log' })
  getVarianceAudit(
    @CurrentUser() user: AuthenticatedUser,
    @Query('dateRange') dateRange?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('companyId') companyId?: string,
    @Query('outletId') outletId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.service.getVarianceAuditReport(
      user,
      this.parseQuery(dateRange, fromDate, toDate, companyId, outletId, status, search),
    );
  }

  @Get('currency-valuation')
  @RequirePermission('reports', 'read')
  @ApiOperation({ summary: 'RPT-005 Multi-Currency Treasury Holdings & Valuation Report' })
  getCurrencyValuation(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') companyId?: string,
    @Query('outletId') outletId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.getCurrencyValuationReport(
      user,
      this.parseQuery(undefined, undefined, undefined, companyId, outletId, undefined, search),
    );
  }

  @Get('audit-governance')
  @RequirePermission('reports', 'read')
  @ApiOperation({ summary: 'RPT-006 Maker-Checker Audit SLA & Governance Compliance Report' })
  getAuditGovernance(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') companyId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.getAuditGovernanceReport(
      user,
      this.parseQuery(undefined, undefined, undefined, companyId, undefined, undefined, search),
    );
  }
}
