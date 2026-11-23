import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { DashboardService } from './dashboard.service';

@ApiTags('Executive Control Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get live scoped KPI summary and Outlet Daily Close Readiness Matrix' })
  getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') companyId?: string,
    @Query('outletId') outletId?: string,
    @Query('date') date?: string,
  ) {
    return this.service.getSummary(user, {
      companyId: companyId ? Number(companyId) : undefined,
      outletId,
      date,
    });
  }
}
