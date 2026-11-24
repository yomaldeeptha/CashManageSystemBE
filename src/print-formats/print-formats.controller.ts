import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrintFormatsService } from './print-formats.service';

@ApiTags('Print Formats')
@ApiBearerAuth('JWT-auth')
@Controller('print-formats')
export class PrintFormatsController {
  constructor(private readonly service: PrintFormatsService) {}

  @Get()
  @RequirePermission('printFormats', 'read')
  @ApiOperation({ summary: 'List all 6 official corporate voucher print formats' })
  list() {
    return this.service.listTemplates();
  }

  @Get(':key/preview')
  @RequirePermission('printFormats', 'read')
  @ApiOperation({ summary: 'Fetch live document preview data for a print format template' })
  preview(@CurrentUser() user: AuthenticatedUser, @Param('key') key: string) {
    return this.service.getPreviewData(user, key);
  }
}
