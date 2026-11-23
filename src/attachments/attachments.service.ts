import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ChangeLogService } from '../common/audit/audit.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'text/plain',
  'text/csv',
  'application/json',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

@Injectable()
export class AttachmentsService {
  private readonly uploadRoot: string;
  private readonly maxBytes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    @Optional() private readonly changeLogService?: ChangeLogService,
  ) {
    this.uploadRoot = path.resolve(
      process.cwd(),
      this.configService.get<string>('UPLOAD_DIR') || './uploads',
    );
    this.maxBytes =
      this.configService.get<number>('MAX_UPLOAD_SIZE_BYTES') || 10 * 1024 * 1024;
  }

  private ensureUploadDir(): void {
    if (!fs.existsSync(this.uploadRoot)) {
      fs.mkdirSync(this.uploadRoot, { recursive: true });
    }
  }

  private formatSize(bytes: number): string {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  private classifyDocType(mimeType: string): string {
    if (mimeType === 'application/pdf') return 'PDF Document';
    if (mimeType.startsWith('image/')) return 'Image / Slip';
    if (mimeType.startsWith('text/') || mimeType.includes('csv')) return 'Text Document';
    return 'Document';
  }

  async uploadFile(
    user: AuthenticatedUser,
    file: Express.Multer.File,
    body: {
      entityType: string;
      entityId: number;
      lineRef?: string;
      docType?: string;
      remark?: string;
    },
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }
    if (file.size > this.maxBytes) {
      throw new BadRequestException(
        `File exceeds maximum allowed size of ${Math.round(this.maxBytes / (1024 * 1024))} MB.`,
      );
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(`Unsupported file type "${file.mimetype}".`);
    }

    this.ensureUploadDir();
    const ext = path.extname(file.originalname).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 10);
    const storedName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const storagePath = path.join(this.uploadRoot, storedName);
    await fs.promises.writeFile(storagePath, file.buffer);

    const record = await this.prisma.$transaction(async (tx) => {
      const created = await tx.documentAttachment.create({
        data: {
          entityType: body.entityType,
          entityId: Number(body.entityId),
          lineRef: body.lineRef || null,
          fileName: path.basename(file.originalname),
          storedName,
          mimeType: file.mimetype,
          fileSizeBytes: file.size,
          fileSizeLabel: this.formatSize(file.size),
          docType: body.docType || this.classifyDocType(file.mimetype),
          remark: body.remark || '',
          storagePath,
          uploadedById: user.id,
          uploadedByName: user.fullName,
          createUserId: user.id,
          updateUserId: user.id,
        },
      });

      if (this.changeLogService) {
        await this.changeLogService.logCreate({
          tableName: 'DocumentAttachment',
          recordId: created.id,
          recordCode: created.fileName,
          newValues: created,
          actor: user,
          tx,
        });
      }

      await this.auditService.log({
        entityType: body.entityType,
        entityId: Number(body.entityId),
        action: 'ATTACH_FILE',
        step: `Uploaded attachment ${created.fileName}`,
        performedById: user.id,
        performedByName: user.fullName,
        tx,
      });

      return created;
    });

    return this.serialize(record);
  }

  private serialize(r: {
    id: number;
    entityType: string;
    entityId: number;
    lineRef: string | null;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
    fileSizeLabel: string;
    docType: string;
    remark: string;
    uploadedByName: string;
    createdAt: Date;
  }) {
    return {
      id: r.id,
      entityType: r.entityType,
      entityId: r.entityId,
      lineRef: r.lineRef,
      fileName: r.fileName,
      mimeType: r.mimeType,
      fileSizeBytes: r.fileSizeBytes,
      fileSize: r.fileSizeLabel,
      type: r.docType,
      docType: r.docType,
      remark: r.remark,
      uploadedBy: r.uploadedByName,
      uploadDate: r.createdAt.toISOString().slice(0, 10),
      downloadUrl: `/api/v1/attachments/${r.id}/download`,
    };
  }

  async list(entityType: string, entityId: number) {
    const rows = await this.prisma.documentAttachment.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.serialize(r));
  }

  async getFileForDownload(id: number) {
    const record = await this.prisma.documentAttachment.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`Attachment #${id} not found.`);
    if (!fs.existsSync(record.storagePath)) {
      throw new NotFoundException('Stored attachment file is unavailable on disk.');
    }
    return record;
  }

  async updateRemark(id: number, remark: string) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.documentAttachment.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException(`Attachment #${id} not found.`);
      const next = await tx.documentAttachment.update({
        where: { id },
        data: { remark, ...(this.changeLogService ? this.changeLogService.stampUpdate() : {}) },
      });
      if (this.changeLogService) {
        await this.changeLogService.logUpdate({
          tableName: 'DocumentAttachment',
          recordId: id,
          recordCode: next.fileName,
          oldValues: existing,
          newValues: next,
          tx,
        });
      }
      return next;
    });
    return this.serialize(updated);
  }

  async remove(user: AuthenticatedUser, id: number) {
    const record = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.documentAttachment.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException(`Attachment #${id} not found.`);
      await tx.documentAttachment.delete({ where: { id } });
      if (this.changeLogService) {
        await this.changeLogService.logDelete({
          tableName: 'DocumentAttachment',
          recordId: id,
          recordCode: existing.fileName,
          oldValues: existing,
          actor: user,
          tx,
        });
      }
      await this.auditService.log({
        entityType: existing.entityType,
        entityId: existing.entityId,
        action: 'DELETE_ATTACHMENT',
        step: `Removed attachment ${existing.fileName}`,
        performedById: user.id,
        performedByName: user.fullName,
        tx,
      });
      return existing;
    });
    if (fs.existsSync(record.storagePath)) {
      await fs.promises.unlink(record.storagePath).catch(() => undefined);
    }
    return { deleted: true, id };
  }
}
