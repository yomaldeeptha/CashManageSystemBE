import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ChangeLogService } from '../common/audit/audit.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { getEffectiveScope } from '../common/utils/scope.util';

const IMMUTABLE_DOC_STATUSES = new Set([
  'Approved',
  'Posted',
  'Locked',
  'Settled',
  'Verified & Settled',
  'Paid',
]);

const ALLOWED_ENTITY_TYPES = new Set([
  'cash_deposit',
  'cashier_payment',
  'cashier_settlement',
  'cash_collection_receipt',
  'main_cashier_payment',
  'main_cashier_settlement',
  'outlet_bank_deposit',
  'petty_cash_request',
  'petty_cash_advance',
  'petty_cash_bill_submission',
  'petty_cash_return',
  'float_reimbursement',
  'sales_reconciliation',
  'general',
]);

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
    const configuredUploadDir = this.configService.get<string>('UPLOAD_DIR');
    if (configuredUploadDir) {
      this.uploadRoot = path.resolve(process.cwd(), configuredUploadDir);
    } else if (process.env.VERCEL) {
      // Vercel serverless filesystem is read-only outside /tmp
      this.uploadRoot = path.join(os.tmpdir(), 'bnf-cms-uploads');
    } else {
      this.uploadRoot = path.resolve(process.cwd(), './uploads');
    }
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

  private async verifyEntityAccess(
    user: AuthenticatedUser,
    entityType: string,
    entityId: number,
    requireWrite: boolean,
  ): Promise<void> {
    if (!entityType || !ALLOWED_ENTITY_TYPES.has(entityType)) {
      throw new BadRequestException(`Unsupported attachment entityType "${entityType}".`);
    }
    if (!Number.isInteger(entityId) || entityId <= 0) {
      throw new BadRequestException('A valid positive entityId is required.');
    }

    const moduleKey = entityType.startsWith('petty_cash') || entityType === 'float_reimbursement'
      ? 'pettyCash'
      : entityType === 'sales_reconciliation'
        ? 'salesRecon'
        : 'cashDeposit';

    if (user.roleCode !== 'ADM') {
      const perms = user.permissions?.[moduleKey];
      const allowed = requireWrite ? Boolean(perms?.create || perms?.update) : Boolean(perms?.read);
      if (!allowed) {
        throw new ForbiddenException(
          `Insufficient permissions to ${requireWrite ? 'modify' : 'view'} attachments for "${entityType}".`,
        );
      }
    }

    if (entityType === 'general') return;

    const scope = await getEffectiveScope(this.prisma, user);
    let doc: { companyId?: number | null; branchId?: number | null; outletId?: number | null; status?: string | null } | null = null;

    if (entityType === 'cash_deposit') {
      doc = await this.prisma.cashDeposit.findUnique({
        where: { id: entityId },
        select: { companyId: true, branchId: true, outletId: true, status: true },
      });
    } else if (entityType === 'cashier_payment') {
      const r = await this.prisma.cashierPayment.findUnique({
        where: { id: entityId },
        select: { companyId: true, branchId: true, outletId: true, approvalStatus: true },
      });
      if (r) doc = { ...r, status: r.approvalStatus };
    } else if (entityType === 'cashier_settlement') {
      doc = await this.prisma.cashierSettlement.findUnique({
        where: { id: entityId },
        select: { companyId: true, branchId: true, outletId: true, status: true },
      });
    } else if (entityType === 'main_cashier_payment') {
      const r = await this.prisma.mainCashierPayment.findUnique({
        where: { id: entityId },
        select: { companyId: true, branchId: true, outletId: true, approvalStatus: true },
      });
      if (r) doc = { ...r, status: r.approvalStatus };
    } else if (entityType === 'main_cashier_settlement') {
      doc = await this.prisma.mainCashierSettlement.findUnique({
        where: { id: entityId },
        select: { companyId: true, branchId: true, outletId: true, status: true },
      });
    } else if (entityType === 'outlet_bank_deposit') {
      doc = await this.prisma.outletBankDeposit.findUnique({
        where: { id: entityId },
        select: { companyId: true, branchId: true, outletId: true, status: true },
      });
    } else if (entityType === 'petty_cash_request') {
      doc = await this.prisma.pettyCashRequest.findUnique({
        where: { id: entityId },
        select: { companyId: true, branchId: true, status: true },
      });
    } else if (entityType === 'petty_cash_advance') {
      doc = await this.prisma.pettyCashAdvance.findUnique({
        where: { id: entityId },
        select: { companyId: true, branchId: true, status: true },
      });
    } else if (entityType === 'petty_cash_bill_submission') {
      doc = await this.prisma.pettyCashBillSubmission.findUnique({
        where: { id: entityId },
        select: { companyId: true, branchId: true, status: true },
      });
    } else if (entityType === 'petty_cash_return') {
      doc = await this.prisma.pettyCashReturn.findUnique({
        where: { id: entityId },
        select: { companyId: true, branchId: true, status: true },
      });
    } else if (entityType === 'sales_reconciliation') {
      doc = await this.prisma.salesReconciliation.findUnique({
        where: { id: entityId },
        select: { companyId: true, branchId: true, outletId: true, status: true },
      });
    } else {
      return;
    }

    if (!doc) {
      throw new NotFoundException(`Target document ${entityType} #${entityId} not found.`);
    }
    if (!scope.unrestricted) {
      if (doc.companyId && !scope.companyIds.includes(doc.companyId)) {
        throw new ForbiddenException('You are not authorized to access this company document.');
      }
      if (doc.branchId && !scope.branchIds.includes(doc.branchId)) {
        throw new ForbiddenException('You are not authorized to access this branch document.');
      }
      if (doc.outletId && !scope.outletIds.includes(doc.outletId)) {
        throw new ForbiddenException('You are not authorized to access this outlet document.');
      }
    }
    if (requireWrite && doc.status && IMMUTABLE_DOC_STATUSES.has(doc.status)) {
      throw new ForbiddenException(
        `Cannot modify attachments on "${doc.status}" document (${entityType} #${entityId}).`,
      );
    }
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

    await this.verifyEntityAccess(user, body.entityType, Number(body.entityId), true);

    this.ensureUploadDir();
    const ext = path.extname(file.originalname).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 10);
    const storedName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const storagePath = path.join(this.uploadRoot, storedName);
    await fs.promises.writeFile(storagePath, file.buffer);

    let record;
    try {
      record = await this.prisma.$transaction(async (tx) => {
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
    } catch (err) {
      await fs.promises.unlink(storagePath).catch(() => undefined);
      throw err;
    }

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

  async list(user: AuthenticatedUser, entityType: string, entityId: number) {
    await this.verifyEntityAccess(user, entityType, entityId, false);
    const rows = await this.prisma.documentAttachment.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.serialize(r));
  }

  async getFileForDownload(user: AuthenticatedUser, id: number) {
    const record = await this.prisma.documentAttachment.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`Attachment #${id} not found.`);
    await this.verifyEntityAccess(user, record.entityType, record.entityId, false);
    if (!fs.existsSync(record.storagePath)) {
      throw new NotFoundException('Stored attachment file is unavailable on disk.');
    }
    return record;
  }

  async updateRemark(user: AuthenticatedUser, id: number, remark: string) {
    const existingPre = await this.prisma.documentAttachment.findUnique({ where: { id } });
    if (!existingPre) throw new NotFoundException(`Attachment #${id} not found.`);
    await this.verifyEntityAccess(user, existingPre.entityType, existingPre.entityId, true);

    const updated = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.documentAttachment.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException(`Attachment #${id} not found.`);
      const next = await tx.documentAttachment.update({
        where: { id },
        data: { remark, updateUserId: user.id },
      });
      if (this.changeLogService) {
        await this.changeLogService.logUpdate({
          tableName: 'DocumentAttachment',
          recordId: id,
          recordCode: next.fileName,
          oldValues: existing,
          newValues: next,
          actor: user,
          tx,
        });
      }
      return next;
    });
    return this.serialize(updated);
  }

  async remove(user: AuthenticatedUser, id: number) {
    const existingPre = await this.prisma.documentAttachment.findUnique({ where: { id } });
    if (!existingPre) throw new NotFoundException(`Attachment #${id} not found.`);
    await this.verifyEntityAccess(user, existingPre.entityType, existingPre.entityId, true);

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
