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
import { MasterDataService } from './master-data.service';

@ApiTags('Master Data (25 Catalogs)')
@ApiBearerAuth('JWT-auth')
@Controller('master-data')
export class MasterDataController {
  constructor(private readonly service: MasterDataService) {}

  @Get('bundle')
  @ApiOperation({ summary: 'Fetch complete scoped master-data bundle across all 25 catalogs' })
  getBundle(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getMasterBundle(user);
  }

  @Get('exchange-rates/resolve')
  @ApiOperation({ summary: 'Resolve active exchange rate between currencies (defaults to system base currency)' })
  resolveRate(@Query('from') from: string, @Query('to') to?: string) {
    return this.service.resolveExchangeRate(from || 'USD', to);
  }

  @Get(':catalog')
  @ApiOperation({ summary: 'List records from a specific master data catalog' })
  listCatalog(
    @Param('catalog') catalog: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search?: string,
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.service.listCatalog(catalog, user, {
      search,
      companyId: companyId ? Number(companyId) : undefined,
      branchId: branchId ? Number(branchId) : undefined,
      departmentId: departmentId ? Number(departmentId) : undefined,
    });
  }

  @Post(':catalog')
  @RequirePermission('masterData', 'create')
  @ApiOperation({ summary: 'Create a record in a master data catalog' })
  createRecord(
    @Param('catalog') catalog: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.createRecord(catalog, user, payload);
  }

  @Patch(':catalog/:id')
  @RequirePermission('masterData', 'update')
  @ApiOperation({ summary: 'Update a record in a master data catalog' })
  updateRecord(
    @Param('catalog') catalog: string,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.updateRecord(catalog, id, user, payload);
  }

  @Patch(':catalog/:id/toggle-status')
  @RequirePermission('masterData', 'update')
  @ApiOperation({ summary: 'Toggle Active/Inactive status of a master data record' })
  toggleStatus(
    @Param('catalog') catalog: string,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.toggleStatus(catalog, id, user);
  }

  @Delete(':catalog/:id')
  @RequirePermission('masterData', 'delete')
  @ApiOperation({ summary: 'Delete a master data record if unreferenced' })
  deleteRecord(
    @Param('catalog') catalog: string,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.deleteRecord(catalog, id, user);
  }
}
