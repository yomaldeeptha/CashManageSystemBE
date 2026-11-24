import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../decorators/auth.decorators';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { ChangeLogService } from './audit.service';
import { AuditLogQueryDto } from './audit.types';

const RESTRICTED_ADMIN_TABLES = new Set([
  'user',
  'role',
  'rolepermission',
  'usergroup',
  'userscreenauthorization',
  'businessconfig',
  'screen',
  'menunode',
]);

const TABLE_MODULE_PERMISSION_MAP: Record<string, string> = {
  cashdeposit: 'cashDeposit',
  cashierpayment: 'cashDeposit',
  cashiersettlement: 'cashDeposit',
  cashcollectionreceipt: 'cashDeposit',
  maincashierpayment: 'cashDeposit',
  maincashiersettlement: 'cashDeposit',
  outletbankdeposit: 'cashDeposit',
  bankreconciliation: 'cashDeposit',
  pettycashrequest: 'pettyCash',
  pettycashadvance: 'pettyCash',
  pettycashbillsubmission: 'pettyCash',
  pettycashreturn: 'pettyCash',
  floatreimbursement: 'pettyCash',
  pettycashiou: 'pettyCash',
  salesreconciliation: 'salesRecon',
  varianceincident: 'salesRecon',
  approvalinstance: 'approvals',
  approvalstage: 'approvals',
  approvaltemplate: 'approvals',
  notificationtemplate: 'notifications',
  printtemplate: 'printFormats',
};

/**
 * Read-Only Audit & Change Logs REST Controller.
 *
 * Strictly append-only enforcement: exposes ONLY GET endpoints.
 * No POST, PUT, PATCH, or DELETE endpoints exist for ChangeLogs.
 */
@ApiTags('Audit & Change Logs')
@ApiBearerAuth('JWT-auth')
@Controller('audit-logs')
export class ChangeLogsController {
  constructor(private readonly changeLogService: ChangeLogService) {}

  @Get()
  @RequirePermission('auditExport', 'read')
  @ApiOperation({ summary: 'List paginated, filterable field-level change logs across all entities' })
  listLogs(@Query() query: AuditLogQueryDto) {
    return this.changeLogService.getAuditLogs(query);
  }

  @Get('tables')
  @RequirePermission('auditExport', 'read')
  @ApiOperation({ summary: 'List distinct audited table/entity names' })
  listTables() {
    return this.changeLogService.getAvailableTables();
  }

  @Get('record/:tableName/:recordId')
  @ApiOperation({ summary: 'Retrieve complete chronological change history for a single record' })
  getRecordHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tableName') tableName: string,
    @Param('recordId') recordId: string,
  ) {
    const normalizedTable = tableName.trim().toLowerCase();
    const isAdminOrAuditor =
      user.roleCode === 'ADM' || Boolean(user.permissions?.auditExport?.read);

    if (RESTRICTED_ADMIN_TABLES.has(normalizedTable)) {
      if (!isAdminOrAuditor && !user.permissions?.userManagement?.read) {
        throw new ForbiddenException(
          `You are not authorized to inspect change history for "${tableName}".`,
        );
      }
    } else if (!isAdminOrAuditor) {
      const requiredModule = TABLE_MODULE_PERMISSION_MAP[normalizedTable] || 'masterData';
      if (!user.permissions?.[requiredModule]?.read) {
        throw new ForbiddenException(
          `You are not authorized to inspect change history for "${tableName}".`,
        );
      }
    }
    return this.changeLogService.getRecordHistory(tableName, recordId);
  }

  @Get('user/:userId')
  @RequirePermission('auditExport', 'read')
  @ApiOperation({ summary: 'Retrieve paginated audit activity for a specific user' })
  getUserActivity(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() query: AuditLogQueryDto,
  ) {
    return this.changeLogService.getUserActivity(userId, query);
  }

  @Get(':id')
  @RequirePermission('auditExport', 'read')
  @ApiOperation({ summary: 'Get full field-level comparison details for a single change log entry' })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.changeLogService.getAuditLogById(id);
  }
}
