import { TASK_QUEUE } from '@eoa/contracts';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ShopAccessService } from './common/guards/shop-access.service';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { validateEnvironment } from './config/env.validation';
import { DatabaseModule } from './database.module';
import { LlmModule } from './integrations/llm/llm.module';
import { AssetsModule } from './modules/assets/assets.module';
import { AuditModule } from './modules/audit/audit.module';
import { CompetitorsModule } from './modules/competitors/competitors.module';
import { CreativesModule } from './modules/creatives/creatives.module';
import { DiagnosisModule } from './modules/diagnosis/diagnosis.module';
import { ExperimentsModule } from './modules/experiments/experiments.module';
import { IdentityModule } from './modules/identity/identity.module';
import { ImportsModule } from './modules/imports/imports.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { ProductsModule } from './modules/products/products.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ShopsModule } from './modules/shops/shops.module';
import { SystemModule } from './modules/system/system.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { DemoModeService } from './demo-mode.service';
import { DemoStateModule } from './modules/demo-state/demo-state.module';

function redisConnection(urlValue: string) {
  const url = new URL(urlValue);
  return { host: url.hostname, port: Number(url.port || 6379), username: url.username || undefined, password: url.password || undefined, db: Number(url.pathname.slice(1) || 0) };
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DatabaseModule,
    BullModule.forRootAsync({ inject: [ConfigService], useFactory: (config: ConfigService) => ({ connection: redisConnection(config.getOrThrow('REDIS_URL')) }) }),
    LlmModule,
    AuditModule,
    IdentityModule,
    ShopsModule,
    ProductsModule,
    CompetitorsModule,
    DiagnosisModule,
    CreativesModule,
    TasksModule,
    AssetsModule,
    ExperimentsModule,
    MetricsModule,
    ReportsModule,
    ImportsModule,
    SystemModule,
    DemoStateModule,
  ],
  providers: [
    DemoModeService,
    ShopAccessService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [ShopAccessService],
})
export class AppModule {}
