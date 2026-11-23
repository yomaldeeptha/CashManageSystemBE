import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './database/prisma.module';
import { ChangeLogModule } from './common/audit/audit.module';
import { CommonServicesModule } from './common/services/common-services.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { HealthModule } from './health/health.module';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { ScreensModule } from './screens/screens.module';
import { BusinessConfigModule } from './business-config/business-config.module';
import { NumberSeriesModule } from './number-series/number-series.module';
import { PrintFormatsModule } from './print-formats/print-formats.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { MasterDataModule } from './master-data/master-data.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { CashDepositModule } from './cash-deposit/cash-deposit.module';
import { PettyCashModule } from './petty-cash/petty-cash.module';
import { SalesReconModule } from './sales-recon/sales-recon.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: Number(config.get('THROTTLE_TTL_MS') || 60000),
          limit: Number(config.get('THROTTLE_LIMIT') || 120),
        },
      ],
    }),
    PrismaModule,
    ChangeLogModule,
    CommonServicesModule,
    AuditModule,
    NotificationsModule,
    HealthModule,
    AuthModule,
    UsersModule,
    RolesModule,
    ScreensModule,
    BusinessConfigModule,
    NumberSeriesModule,
    PrintFormatsModule,
    AttachmentsModule,
    MasterDataModule,
    ApprovalsModule,
    CashDepositModule,
    PettyCashModule,
    SalesReconModule,
    DashboardModule,
    ReportsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
