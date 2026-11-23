import {
  Body,
  Controller,
  Delete,
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
import { NumberSeriesService } from './number-series.service';
import { SaveFormMasterDto, SaveNumberSeriesDto } from './dto/number-series.dto';

@ApiTags('Number Series & Form Master')
@ApiBearerAuth('JWT-auth')
@Controller()
export class NumberSeriesController {
  constructor(private readonly service: NumberSeriesService) {}

  @Get('number-series')
  @ApiOperation({ summary: 'List all configured document number series' })
  listSeries() {
    return this.service.listSeries();
  }

  @Post('number-series')
  @RequirePermission('masterData', 'create')
  @ApiOperation({ summary: 'Create a new document number series' })
  createSeries(@CurrentUser() actor: AuthenticatedUser, @Body() dto: SaveNumberSeriesDto) {
    return this.service.createSeries(actor, dto);
  }

  @Patch('number-series/:id')
  @RequirePermission('masterData', 'update')
  @ApiOperation({ summary: 'Update a document number series' })
  updateSeries(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveNumberSeriesDto,
  ) {
    return this.service.updateSeries(actor, id, dto);
  }

  @Delete('number-series/:id')
  @RequirePermission('masterData', 'delete')
  @ApiOperation({ summary: 'Delete an unlocked document number series' })
  deleteSeries(@CurrentUser() actor: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.deleteSeries(actor, id);
  }

  @Patch('number-series/:id/lock')
  @RequirePermission('masterData', 'update')
  @ApiOperation({ summary: 'Lock or unlock a document number series' })
  toggleLock(@CurrentUser() actor: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.toggleLock(actor, id);
  }

  @Patch('number-series/:id/default')
  @RequirePermission('masterData', 'update')
  @ApiOperation({ summary: 'Set a number series as default for its Form ID' })
  setDefault(@CurrentUser() actor: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.setDefault(actor, id);
  }

  @Post('number-series/:id/next')
  @RequirePermission('masterData', 'update')
  @ApiOperation({ summary: 'Atomically allocate and increment the next document number' })
  incrementNext(@CurrentUser() actor: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.incrementNext(actor, id);
  }

  @Get('form-masters')
  @ApiOperation({ summary: 'List all registered Form Masters' })
  listFormMasters() {
    return this.service.listFormMasters();
  }

  @Post('form-masters')
  @RequirePermission('masterData', 'create')
  @ApiOperation({ summary: 'Create or update a Form Master record' })
  saveFormMaster(@CurrentUser() actor: AuthenticatedUser, @Body() dto: SaveFormMasterDto) {
    return this.service.saveFormMaster(actor, dto);
  }
}
