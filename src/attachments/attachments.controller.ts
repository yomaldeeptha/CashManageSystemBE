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
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AttachmentsService } from './attachments.service';

@ApiTags('Document Attachments')
@ApiBearerAuth('JWT-auth')
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload and link a supporting document attachment' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: {
      entityType: string;
      entityId: string;
      lineRef?: string;
      docType?: string;
      remark?: string;
    },
  ) {
    return this.service.uploadFile(user, file, {
      entityType: body.entityType || 'general',
      entityId: Number(body.entityId || 0),
      lineRef: body.lineRef,
      docType: body.docType,
      remark: body.remark,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List attachments linked to a specific document' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('entityType') entityType: string,
    @Query('entityId', ParseIntPipe) entityId: number,
  ) {
    return this.service.list(user, entityType, entityId);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Stream/download an uploaded attachment file' })
  async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const record = await this.service.getFileForDownload(user, id);
    const isSafeInline =
      record.mimeType === 'application/pdf' || record.mimeType.startsWith('image/');
    const disposition = isSafeInline ? 'inline' : 'attachment';
    const safeName = record.fileName.replace(/["\\\r\n]/g, '_');
    res.setHeader('Content-Type', record.mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `${disposition}; filename="${safeName}"`);
    fs.createReadStream(record.storagePath).pipe(res);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update attachment remark text' })
  updateRemark(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { remark: string },
  ) {
    return this.service.updateRemark(user, id, body.remark || '');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an uploaded attachment' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(user, id);
  }
}
