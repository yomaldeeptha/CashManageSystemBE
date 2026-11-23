import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/auth.decorators';
import { PrismaService } from '../database/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

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
    return {
      status: database === 'connected' ? 'ok' : 'degraded',
      service: 'BNF Connect Cash Management System API',
      version: '1.0.0',
      database,
      latencyMs,
      timestamp: new Date().toISOString(),
    };
  }
}
