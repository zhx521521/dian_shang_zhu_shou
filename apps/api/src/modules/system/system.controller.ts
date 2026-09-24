import { AuthenticatedUser, RoleCode } from '@eoa/contracts';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Public } from '../../common/auth/public.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { DatabaseService } from '../../database.service';
import { DemoModeService } from '../../demo-mode.service';
import { DemoStateService } from '../demo-state/demo-state.service';
import { SecretCipherService } from './secret-cipher.service';
import { UpsertServiceConfigDto } from './system.dto';

@ApiTags('system')
@Controller()
export class SystemController {
  constructor(private readonly db: DatabaseService, private readonly cipher: SecretCipherService, private readonly demo: DemoModeService, private readonly demoState: DemoStateService) {}
  @Public() @Get('health') async health() { return { status: this.db.available ? 'ok' : 'degraded', timestamp: new Date().toISOString(), services: { api: 'up', database: this.db.available ? 'up' : 'demo-fallback', queue: process.env.REDIS_URL ? 'configured' : 'missing' } }; }
  @ApiBearerAuth() @Get('system/service-configs') @Roles(RoleCode.ADMIN)
  async list(@CurrentUser() user: AuthenticatedUser) {
    if (this.demo.enabled && !this.db.available) return user.shopIds.flatMap((shopId) => this.demoState.list<{ apiKey?: string; encryptedApiKey?: string }>(shopId, 'configs')).map(({ apiKey, encryptedApiKey, ...config }) => ({ ...config, apiKey: apiKey || encryptedApiKey ? '********' : null }));
    const configs = await this.db.client.serviceConfig.findMany({ orderBy: { serviceType: 'asc' } }); return configs.map(({ encryptedApiKey, ...config }) => ({ ...config, apiKey: encryptedApiKey ? '********' : null }));
  }
  @ApiBearerAuth() @Post('system/service-configs') @Roles(RoleCode.ADMIN)
  upsert(@CurrentUser() user: AuthenticatedUser, @Body() input: UpsertServiceConfigDto) {
    const encryptedApiKey = input.apiKey ? this.cipher.encrypt(input.apiKey) : undefined;
    if (this.demo.enabled && !this.db.available) {
      const shopId = user.shopIds[0];
      const configs = this.demoState.list<{ serviceType: string }>(shopId, 'configs');
      const next = { serviceType: input.serviceType, baseUrl: input.baseUrl, modelName: input.modelName, encryptedApiKey, timeoutSeconds: input.timeoutSeconds, maxRetries: input.maxRetries, concurrency: input.concurrency, enabled: input.enabled, updatedBy: user.id, updatedAt: new Date().toISOString() };
      this.demoState.save(shopId, { configs: [next, ...configs.filter((config) => config.serviceType !== input.serviceType)] });
      const { encryptedApiKey: _secret, ...visible } = next;
      return { ...visible, apiKey: encryptedApiKey ? '********' : null };
    }
    return this.db.client.serviceConfig.upsert({ where: { serviceType: input.serviceType }, create: { serviceType: input.serviceType, baseUrl: input.baseUrl, modelName: input.modelName, encryptedApiKey, timeoutSeconds: input.timeoutSeconds, maxRetries: input.maxRetries, concurrency: input.concurrency, enabled: input.enabled, createdBy: user.id, updatedBy: user.id }, update: { baseUrl: input.baseUrl, modelName: input.modelName, ...(encryptedApiKey ? { encryptedApiKey } : {}), timeoutSeconds: input.timeoutSeconds, maxRetries: input.maxRetries, concurrency: input.concurrency, enabled: input.enabled, updatedBy: user.id, version: { increment: 1 } } });
  }
}
