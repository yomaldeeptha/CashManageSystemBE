import {
  Body,
  Controller,
  Delete,
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
import { ApprovalsService } from './approvals.service';
import {
  ApprovalDecisionDto,
  SaveApprovalStageDto,
  SaveApprovalTemplateDto,
} from './dto/approvals.dto';

@ApiTags('Governance & Multi-Stage Approvals')
@ApiBearerAuth('JWT-auth')
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly service: ApprovalsService) {}

  @Get('queue')
  @RequirePermission('approvals', 'read')
  @ApiOperation({ summary: 'Get unified scoped approval queue across Cash Deposits, Petty Cash, and Sales Recon' })
  getQueue(
    @CurrentUser() user: AuthenticatedUser,
    @Query('type') type?: string,
    @Query('companyId') companyId?: string,
    @Query('outletId') outletId?: string,
  ) {
    return this.service.getQueue(
      user,
      type,
      companyId ? Number(companyId) : undefined,
      outletId,
    );
  }

  @Post(':id/decide')
  @RequirePermission('approvals', 'approve')
  @ApiOperation({ summary: 'Approve, return for clarification, or reject an approval workflow instance' })
  decide(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApprovalDecisionDto,
  ) {
    return this.service.decide(user, id, dto);
  }

  @Get('stages')
  @RequirePermission('approvals', 'read')
  @ApiOperation({ summary: 'List configured approval stages and approver signing limits' })
  listStages() {
    return this.service.listStages();
  }

  @Post('stages')
  @RequirePermission('approvals', 'create')
  @ApiOperation({ summary: 'Create an approval stage' })
  createStage(@CurrentUser() user: AuthenticatedUser, @Body() dto: SaveApprovalStageDto) {
    return this.service.saveStage(user, dto);
  }

  @Patch('stages/:id')
  @RequirePermission('approvals', 'update')
  @ApiOperation({ summary: 'Update an approval stage' })
  updateStage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveApprovalStageDto,
  ) {
    return this.service.saveStage(user, dto, id);
  }

  @Delete('stages/:id')
  @RequirePermission('approvals', 'delete')
  @ApiOperation({ summary: 'Delete an approval stage' })
  deleteStage(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.deleteStage(user, id);
  }

  @Get('templates')
  @RequirePermission('approvals', 'read')
  @ApiOperation({ summary: 'List configured multi-stage approval templates and conditional rules' })
  listTemplates() {
    return this.service.listTemplates();
  }

  @Post('templates')
  @RequirePermission('approvals', 'create')
  @ApiOperation({ summary: 'Create an approval template' })
  createTemplate(@CurrentUser() user: AuthenticatedUser, @Body() dto: SaveApprovalTemplateDto) {
    return this.service.saveTemplate(user, dto);
  }

  @Patch('templates/:id')
  @RequirePermission('approvals', 'update')
  @ApiOperation({ summary: 'Update an approval template' })
  updateTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveApprovalTemplateDto,
  ) {
    return this.service.saveTemplate(user, dto, id);
  }

  @Delete('templates/:id')
  @RequirePermission('approvals', 'delete')
  @ApiOperation({ summary: 'Delete an approval template' })
  deleteTemplate(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.deleteTemplate(user, id);
  }
}
