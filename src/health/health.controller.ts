import { Controller, Get, Optional } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/auth.decorators';
import { DatabaseService } from '../database/database.service';
import { PrismaService } from '../database/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly databaseService?: DatabaseService,
  ) { }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Check API liveness and Neon PostgreSQL connectivity' })
  async check() {
    let database = 'connected';
    let latencyMs = 0;
    const startedAt = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      latencyMs = Date.now() - startedAt;
    } catch {
      database = 'disconnected';
    }

    let neonServerless = 'skipped';
    if (this.databaseService) {
      try {
        await this.databaseService.ping();
        neonServerless = 'connected';
      } catch {
        neonServerless = 'disconnected';
      }
    }

    return {
      status: database === 'connected' ? 'ok' : 'degraded',
      service: 'BNF Connect Cash Management System API',
      version: '1.0.0',
      database,
      neonServerless,
      latencyMs,
      timestamp: new Date().toISOString(),
    };
  }
}
