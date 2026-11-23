import {
  ForbiddenException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const IMMUTABLE_AUDIT_ERROR =
  'ChangeLogs is strictly append-only: UPDATE and DELETE operations are prohibited.';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['warn', 'error']
          : ['error'],
    });
    this.enforceAppendOnlyAuditModels();
  }

  /**
   * Runtime ORM-level protection ensuring ChangeLogs and AuditLogs can never be
   * updated, upserted, or deleted through the NestJS application Prisma client.
   */
  private enforceAppendOnlyAuditModels(): void {
    const blocked = () => {
      throw new ForbiddenException(IMMUTABLE_AUDIT_ERROR);
    };

    const immutableDelegates = [
      this.changeLog as unknown as Record<string, unknown>,
      this.auditLog as unknown as Record<string, unknown>,
    ];

    for (const delegate of immutableDelegates) {
      if (!delegate) continue;
      for (const op of ['update', 'updateMany', 'upsert', 'delete', 'deleteMany']) {
        Object.defineProperty(delegate, op, {
          value: blocked,
          writable: false,
          configurable: false,
        });
      }
    }
  }

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'test' && process.env.SKIP_PRISMA_CONNECT === 'true') {
      return;
    }
    try {
      await this.$connect();
    } catch (error) {
      this.logger.error(
        'Failed to connect to PostgreSQL on startup',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
