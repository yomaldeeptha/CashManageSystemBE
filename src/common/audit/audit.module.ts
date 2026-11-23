import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditContextInterceptor } from './audit-context.interceptor';
import { ChangeLogService } from './audit.service';
import { ChangeLogsController } from './change-logs.controller';

@Global()
@Module({
  controllers: [ChangeLogsController],
  providers: [
    ChangeLogService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditContextInterceptor,
    },
  ],
  exports: [ChangeLogService],
})
export class ChangeLogModule {}
