import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AuditService } from './audit.service';
import { CreateAuditCommentDto, GenerateAuditExportDto } from './dto/audit.dto';

@ApiTags('Audit & File Export')
@ApiBearerAuth('JWT-auth')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @ApiOperation({ summary: 'Query immutable audit trail entries' })
  getLogs(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('docNo') docNo?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getLogs({
      entityType,
      entityId: entityId ? Number(entityId) : undefined,
      docNo,
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
  }

  @Post('logs/comment')
  @ApiOperation({ summary: 'Append an immutable audit comment to a transaction' })
  addComment(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAuditCommentDto) {
    return this.auditService.addComment(user, dto);
  }

  @Get('staged-export')
  @RequirePermission('auditExport', 'read')
  @ApiOperation({ summary: 'List approved/posted transactions staged for ledger export' })
  getStagedExport(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') companyId?: string,
    @Query('outletId') outletId?: string,
  ) {
    return this.auditService.getStagedExportRecords(user, {
      companyId: companyId ? Number(companyId) : undefined,
      outletId,
    });
  }

  @Post('export')
  @RequirePermission('auditExport', 'unblock')
  @ApiOperation({ summary: 'Generate and persist a verified CSV or JSON audit ledger export batch' })
  generateExport(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateAuditExportDto,
  ) {
    return this.auditService.generateExportBatch(user, dto);
  }

  @Get('export-batches')
  @RequirePermission('auditExport', 'read')
  @ApiOperation({ summary: 'List previously generated audit ledger export batches' })
  listBatches() {
    return this.auditService.listExportBatches();
  }
}
