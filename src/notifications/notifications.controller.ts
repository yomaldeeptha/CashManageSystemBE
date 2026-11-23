import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { NotificationsService } from './notifications.service';
import { UpdateNotificationTemplateDto } from './dto/notifications.dto';

@ApiTags('Notifications & Alerts')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get('templates')
  @RequirePermission('notifications', 'read')
  @ApiOperation({ summary: 'List notification templates and channel configurations' })
  listTemplates() {
    return this.service.listTemplates();
  }

  @Patch('templates/:id')
  @RequirePermission('notifications', 'update')
  @ApiOperation({ summary: 'Update notification template subject, body, or channel toggles' })
  updateTemplate(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateNotificationTemplateDto,
  ) {
    return this.service.updateTemplate(actor, id, dto);
  }

  @Post('templates/:id/test')
  @RequirePermission('notifications', 'update')
  @ApiOperation({ summary: 'Send and record a test notification trigger' })
  triggerTest(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.service.triggerTest(actor, id);
  }

  @Get('inbox')
  @ApiOperation({ summary: 'Fetch operational alerts and notifications for the logged-in user' })
  getInbox(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getInbox(user);
  }

  @Patch('inbox/:id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  markRead(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.markRead(user, id);
  }

  @Patch('inbox/read-all')
  @ApiOperation({ summary: 'Mark all notifications for the current user as read' })
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.service.markAllRead(user);
  }
}
