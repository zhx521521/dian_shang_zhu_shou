import { AuthenticatedUser } from '@eoa/contracts';
import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { DatabaseService } from '../../database.service';
import { ProductsService } from '../products/products.service';
import { CreateMetricDto } from './metrics.dto';
import { calculateMetrics } from './metrics.service';
import { DemoModeService } from '../../demo-mode.service';
import { DemoStateService } from '../demo-state/demo-state.service';
@ApiTags('metrics') @ApiBearerAuth() @Controller('products/:productId/metrics')
export class MetricsController {
  constructor(private readonly db: DatabaseService, private readonly products: ProductsService, private readonly demo: DemoModeService, private readonly demoState: DemoStateService) {}
  @Get() async list(@CurrentUser() user: AuthenticatedUser, @Param('productId', ParseUUIDPipe) productId: string) {
    const product = await this.products.get(user, productId);
    if (this.demo.enabled && !this.db.available) return this.demoState.list<{ productId: string }>(String(product.shopId), 'metrics').filter((item) => item.productId === productId);
    return this.db.client.metricRecord.findMany({ where: { productId }, orderBy: { metricDate: 'desc' } });
  }
  @Post() async create(@CurrentUser() user: AuthenticatedUser, @Param('productId', ParseUUIDPipe) productId: string, @Body() input: CreateMetricDto) {
    const product = await this.products.get(user, productId);
    if (this.demo.enabled && !this.db.available) {
      const metrics = { id: crypto.randomUUID(), productId, date: input.metricDate.toISOString().slice(0, 10), impressions: input.impressions, clicks: input.clicks, visitors: input.visitors, bouncedVisitors: input.bouncedVisitors, paidOrders: input.paidOrders, unitsSold: input.unitsSold, gmv: input.gmv, adSpend: input.adSpend, createdAt: new Date().toISOString() };
      const saved = this.demoState.create(String(product.shopId), 'metrics', metrics);
      return { ...saved, calculated: calculateMetrics(input) };
    }
    const record = await this.db.client.metricRecord.create({ data: { ...input, productId, createdBy: user.id, updatedBy: user.id } }); return { ...record, calculated: calculateMetrics(input) };
  }
}
