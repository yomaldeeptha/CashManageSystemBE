import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { RolesService } from './roles.service';
import { SaveRoleDto, UpdateRolePermissionsDto } from './dto/roles.dto';

@ApiTags('Roles & Permissions')
@ApiBearerAuth('JWT-auth')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermission('rolesPermissions', 'read')
  @ApiOperation({ summary: 'List all roles with module × action permission matrices' })
  findAll() {
    return this.rolesService.findAll();
  }

  @Post()
  @RequirePermission('rolesPermissions', 'create')
  @ApiOperation({ summary: 'Create a new role' })
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: SaveRoleDto) {
    return this.rolesService.create(actor, dto);
  }

  @Patch(':id')
  @RequirePermission('rolesPermissions', 'update')
  @ApiOperation({ summary: 'Update a role' })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveRoleDto,
  ) {
    return this.rolesService.update(actor, id, dto);
  }

  @Put(':id/permissions')
  @RequirePermission('rolesPermissions', 'update')
  @ApiOperation({ summary: 'Replace module × action permissions matrix for a role' })
  updatePermissions(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.rolesService.updatePermissions(actor, id, dto);
  }
}
