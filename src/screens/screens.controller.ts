import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ScreensService } from './screens.service';
import {
  CopyScreenAuthDto,
  SaveScreenDto,
  SaveUserScreenAuthDto,
} from './dto/screens.dto';

@ApiTags('Screen Registry & Authorization')
@ApiBearerAuth('JWT-auth')
@Controller('screens')
export class ScreensController {
  constructor(private readonly screensService: ScreensService) {}

  @Get()
  @ApiOperation({ summary: 'List all registered screens (SCR-*)' })
  listScreens() {
    return this.screensService.listScreens();
  }

  @Get('menu-tree')
  @ApiOperation({ summary: 'Return 3-level authorization menu tree (100-706)' })
  listMenuTree() {
    return this.screensService.listMenuTree();
  }

  @Post()
  @RequirePermission('rolesPermissions', 'update')
  @ApiOperation({ summary: 'Register or update a screen and synchronize its Form Master' })
  saveScreen(@CurrentUser() actor: AuthenticatedUser, @Body() dto: SaveScreenDto) {
    return this.screensService.saveScreen(actor, dto);
  }

  @Get('user-authorizations')
  @RequirePermission('userManagement', 'read')
  @ApiOperation({ summary: 'Get user screen authorization map for all users' })
  getAllAuthMap() {
    return this.screensService.getAllUserAuthorizationsMap();
  }

  @Get('user-authorizations/:userId')
  @ApiOperation({ summary: 'Get screen authorization map for a single user' })
  getUserAuth(@Param('userId', ParseIntPipe) userId: number) {
    return this.screensService.getUserAuthorizations(userId);
  }

  @Put('user-authorizations/:userId')
  @RequirePermission('userManagement', 'update')
  @ApiOperation({ summary: 'Save per-user screen authorization map' })
  saveUserAuth(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: SaveUserScreenAuthDto,
  ) {
    return this.screensService.saveUserAuthorizations(actor, userId, dto);
  }

  @Post('user-authorizations/copy')
  @RequirePermission('userManagement', 'update')
  @ApiOperation({ summary: 'Copy screen authorizations from one user to another' })
  copyAuth(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CopyScreenAuthDto) {
    return this.screensService.copyAuthorizations(actor, dto);
  }
}
