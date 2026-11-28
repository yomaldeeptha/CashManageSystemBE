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

  private lockAuditDelegates(client: Record<string, unknown>): void {
    const blocked = () => {
      throw new ForbiddenException(IMMUTABLE_AUDIT_ERROR);
    };

    const immutableDelegates = [
      client.changeLog as Record<string, unknown> | undefined,
      client.auditLog as Record<string, unknown> | undefined,
    ];

    for (const delegate of immutableDelegates) {
      if (!delegate) continue;
      for (const op of ['update', 'updateMany', 'upsert', 'delete', 'deleteMany']) {
        const desc = Object.getOwnPropertyDescriptor(delegate, op);
        if (desc && desc.configurable === false) continue;
        Object.defineProperty(delegate, op, {
          value: blocked,
          writable: false,
          configurable: false,
        });
      }
    }
  }

  /**
   * Runtime ORM-level protection ensuring ChangeLogs and AuditLogs can never be
   * updated, upserted, or deleted through either the root Prisma client OR
   * interactive $transaction(tx => ...) callbacks.
   */
  private enforceAppendOnlyAuditModels(): void {
    this.lockAuditDelegates(this as unknown as Record<string, unknown>);

    const originalTransaction = this.$transaction.bind(this) as (
      arg: unknown,
      options?: unknown,
    ) => Promise<unknown>;

    Object.defineProperty(this, '$transaction', {
      value: (arg: unknown, options?: unknown) => {
        if (typeof arg === 'function') {
          const wrappedCallback = (tx: Record<string, unknown>) => {
            this.lockAuditDelegates(tx);
            return (arg as (txClient: unknown) => unknown)(tx);
          };
          return options !== undefined
            ? originalTransaction(wrappedCallback, options)
            : originalTransaction(wrappedCallback);
        }
        return options !== undefined
          ? originalTransaction(arg, options)
          : originalTransaction(arg);
      },
      writable: false,
      configurable: false,
    });
  }

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'test' && process.env.SKIP_PRISMA_CONNECT === 'true') {
      return;
    }
    const maxAttempts = 4;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.$connect();
        return;
      } catch (error) {
        if (attempt === maxAttempts) {
          this.logger.error(
            'Failed to connect to PostgreSQL on startup after retries',
            error instanceof Error ? error.stack : String(error),
          );
          throw error;
        }
        this.logger.warn(
          `PostgreSQL startup connect attempt ${attempt}/${maxAttempts} failed; retrying in 2s...`,
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
