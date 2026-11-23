import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { BusinessConfigService } from './business-config.service';
import { UpdateBusinessConfigDto } from './dto/business-config.dto';

@ApiTags('Business Configuration')
@ApiBearerAuth('JWT-auth')
@Controller('business-config')
export class BusinessConfigController {
  constructor(private readonly service: BusinessConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Get active enterprise business configuration including system base currency' })
  getConfig() {
    return this.service.getConfig();
  }

  @Patch()
  @RequirePermission('masterData', 'update')
  @ApiOperation({ summary: 'Update enterprise business configuration and system base currency' })
  updateConfig(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: UpdateBusinessConfigDto,
  ) {
    return this.service.updateConfig(actor, dto);
  }
}
