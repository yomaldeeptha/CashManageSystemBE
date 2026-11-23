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
import { UsersService } from './users.service';
import {
  CreateUserDto,
  CreateUserGroupDto,
  ResetPasswordDto,
  UpdateProfileDto,
  UpdateUserDto,
} from './dto/users.dto';

@ApiTags('Users & User Groups')
@ApiBearerAuth('JWT-auth')
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('users/me')
  @ApiOperation({ summary: 'Get authenticated user profile and preferences' })
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findOne(user.id);
  }

  @Patch('users/me')
  @ApiOperation({ summary: 'Update authenticated user profile and UI preferences' })
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateMe(user, dto);
  }

  @Get('users')
  @RequirePermission('userManagement', 'read')
  @ApiOperation({ summary: 'List system users with search and filters' })
  findAll(
    @Query('search') search?: string,
    @Query('roleId') roleId?: string,
    @Query('groupId') groupId?: string,
    @Query('status') status?: string,
  ) {
    return this.usersService.findAll({
      search,
      roleId: roleId ? Number(roleId) : undefined,
      groupId,
      status,
    });
  }

  @Get('users/:id')
  @RequirePermission('userManagement', 'read')
  @ApiOperation({ summary: 'Get a single user by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post('users')
  @RequirePermission('userManagement', 'create')
  @ApiOperation({ summary: 'Provision a new system user with role, scopes, and authorizations' })
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateUserDto) {
    return this.usersService.create(actor, dto);
  }

  @Patch('users/:id')
  @RequirePermission('userManagement', 'update')
  @ApiOperation({ summary: 'Update user details, entity scope boundaries, and menu authorizations' })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(actor, id, dto);
  }

  @Patch('users/:id/status')
  @RequirePermission('userManagement', 'update')
  @ApiOperation({ summary: 'Toggle user active/inactive status' })
  toggleStatus(@CurrentUser() actor: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.usersService.toggleStatus(actor, id);
  }

  @Post('users/:id/reset-password')
  @RequirePermission('userManagement', 'update')
  @ApiOperation({ summary: 'Reset user password and revoke active sessions' })
  resetPassword(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.usersService.resetPassword(actor, id, dto);
  }

  @Get('user-groups')
  @RequirePermission('userManagement', 'read')
  @ApiOperation({ summary: 'List user groups and their default screen templates' })
  listGroups() {
    return this.usersService.listGroups();
  }

  @Post('user-groups')
  @RequirePermission('userManagement', 'create')
  @ApiOperation({ summary: 'Create or update a user group' })
  saveGroup(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateUserGroupDto) {
    return this.usersService.saveGroup(actor, dto);
  }
}
