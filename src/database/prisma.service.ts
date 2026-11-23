import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

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
  }

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'test' && process.env.SKIP_PRISMA_CONNECT === 'true') {
      return;
    }
    try {
      await this.$connect();
    } catch (error) {
      this.logger.error('Failed to connect to PostgreSQL on startup', error instanceof Error ? error.stack : String(error));
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
