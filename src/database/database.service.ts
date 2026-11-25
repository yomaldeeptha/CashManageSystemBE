import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { neon, NeonQueryFunction } from '@neondatabase/serverless';

export interface NeonPingResult {
  database: string;
  postgresVersion: string;
  latencyMs: number;
}

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly sqlClient: NeonQueryFunction<false, false> | null;

  constructor(private readonly configService: ConfigService) {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    if (
      databaseUrl &&
      !(process.env.NODE_ENV === 'test' && process.env.SKIP_PRISMA_CONNECT === 'true')
    ) {
      this.sqlClient = neon(databaseUrl);
    } else {
      this.sqlClient = null;
    }
  }

  get sql(): NeonQueryFunction<false, false> {
    if (!this.sqlClient) {
      throw new Error('Neon serverless SQL client is not initialized (missing DATABASE_URL).');
    }
    return this.sqlClient;
  }

  async ping(): Promise<NeonPingResult> {
    const startedAt = Date.now();
    if (!this.sqlClient) {
      return {
        database: 'test',
        postgresVersion: 'test',
        latencyMs: 0,
      };
    }

    try {
      const rows = (await this.sqlClient`
        SELECT current_database() AS database_name, version() AS postgres_version
      `) as Array<{ database_name: string; postgres_version: string }>;
      const row = rows[0];
      return {
        database: row?.database_name || 'unknown',
        postgresVersion: row?.postgres_version || 'unknown',
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      this.logger.error(
        'Neon serverless SQL ping failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
