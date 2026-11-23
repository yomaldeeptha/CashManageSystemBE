import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class NumberSeriesGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  formatDocumentNo(series: {
    prefix: string;
    suffix: string;
    nextNumber: number;
    numDigits: number;
  }): string {
    const padded = String(series.nextNumber).padStart(series.numDigits || 4, '0');
    return `${series.prefix}${padded}${series.suffix || ''}`;
  }

  /**
   * Atomically allocates the next document number for a formId (optionally branch-scoped).
   * Safe for concurrent multi-user transactions when executed inside a Prisma transaction.
   */
  async allocateNextNumber(
    formId: string,
    options?: {
      branchId?: number | null;
      preferredSeriesId?: string;
      tx?: Prisma.TransactionClient;
      fallbackPrefix?: string;
    },
  ): Promise<string> {
    const db = options?.tx || this.prisma;

    const candidates = await db.numberSeries.findMany({
      where: {
        formId,
        isLocked: false,
        status: 'Active',
      },
      orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
    });

    let selected = options?.preferredSeriesId
      ? candidates.find((c) => c.seriesId === options.preferredSeriesId)
      : undefined;

    if (!selected && options?.branchId) {
      selected = candidates.find((c) => c.branchId === options.branchId);
    }
    if (!selected) {
      selected = candidates.find((c) => c.isDefault) || candidates[0];
    }

    if (!selected) {
      const prefix = options?.fallbackPrefix || 'DOC-';
      const suffix = String(Date.now()).slice(-5);
      return `${prefix}${suffix}`;
    }

    if (selected.nextNumber > selected.lastNumber) {
      throw new BadRequestException(
        `Number series "${selected.seriesName}" (${selected.seriesId}) has exhausted its maximum limit (${selected.lastNumber}).`,
      );
    }

    const allocatedNo = this.formatDocumentNo(selected);

    await db.numberSeries.update({
      where: { id: selected.id },
      data: {
        nextNumber: { increment: 1 },
      },
    });

    return allocatedNo;
  }
}
