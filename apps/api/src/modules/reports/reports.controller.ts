import { AuthenticatedUser } from '@eoa/contracts';
import { Prisma } from '@eoa/database';
import { Body, Controller, Get, Header, Inject, NotFoundException, Param, ParseUUIDPipe, Post, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { DatabaseService } from '../../database.service';
import { LLM_PROVIDER, LlmProvider } from '../../integrations/llm/llm.provider';
import { ProductsService } from '../products/products.service';
import { calculateMetrics } from '../metrics/metrics.service';
import { CreateReportDto } from './reports.dto';
import { DemoModeService } from '../../demo-mode.service';
import { DemoStateService } from '../demo-state/demo-state.service';
@ApiTags('reports') @ApiBearerAuth() @Controller()
export class ReportsController {
  constructor(private readonly db: DatabaseService, private readonly products: ProductsService, @Inject(LLM_PROVIDER) private readonly llm: LlmProvider, private readonly demo: DemoModeService, private readonly demoState: DemoStateService) {}
  @Get('products/:productId/reports') async list(@CurrentUser() user: AuthenticatedUser, @Param('productId', ParseUUIDPipe) productId: string) {
    const product = await this.products.get(user, productId);
    if (this.demo.enabled && !this.db.available) return this.demoState.list<{ productId: string }>(String(product.shopId), 'reports').filter((item) => item.productId === productId);
    return this.db.client.report.findMany({ where: { productId }, include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } }, orderBy: { createdAt: 'desc' } });
  }
  @Post('products/:productId/reports') async create(@CurrentUser() user: AuthenticatedUser, @Param('productId', ParseUUIDPipe) productId: string, @Body() input: CreateReportDto) {
    const product = await this.products.get(user, productId);
    const start = input.periodStart.toISOString().slice(0, 10);
    const end = input.periodEnd.toISOString().slice(0, 10);
    type ReportMetric = { id: string; productId: string; date: string; impressions: number; clicks: number; visitors: number; bouncedVisitors: number; paidOrders: number; unitsSold: number; gmv: number; adSpend: number };
    const records: ReportMetric[] = this.demo.enabled && !this.db.available
      ? this.demoState.list<ReportMetric>(String(product.shopId), 'metrics').filter((row) => row.productId === productId && row.date >= start && row.date <= end)
      : (await this.db.client.metricRecord.findMany({ where: { productId, experimentId: input.experimentId, metricDate: { gte: input.periodStart, lte: input.periodEnd } }, orderBy: { metricDate: 'asc' } })).map((row) => ({ ...row, date: row.metricDate.toISOString().slice(0, 10), gmv: Number(row.gmv), adSpend: Number(row.adSpend) }));
    const totals = records.reduce((sum, row) => ({ impressions: sum.impressions + row.impressions, clicks: sum.clicks + row.clicks, visitors: sum.visitors + (row.visitors ?? 0), bouncedVisitors: sum.bouncedVisitors + (row.bouncedVisitors ?? 0), paidOrders: sum.paidOrders + row.paidOrders, unitsSold: sum.unitsSold + (row.unitsSold ?? 0), gmv: sum.gmv + Number(row.gmv), adSpend: sum.adSpend + Number(row.adSpend) }), { impressions: 0, clicks: 0, visitors: 0, bouncedVisitors: 0, paidOrders: 0, unitsSold: 0, gmv: 0, adSpend: 0 });
    const calculated = calculateMetrics(totals); const insights = await this.llm.generateReportInsights({ product: product.name, totals, calculated, records });
    const content = { product: { id: product.id, name: product.name }, period: { experimentId: input.experimentId ?? null, periodStart: input.periodStart.toISOString(), periodEnd: input.periodEnd.toISOString() }, totals, calculated, insights, dataCoverage: { days: records.length, sufficient: records.length > 0 } };
    const markdown = this.markdown(product.name, input, totals, calculated, insights, records.length);
    if (this.demo.enabled && !this.db.available) return this.demoState.create(String(product.shopId), 'reports', { id: crypto.randomUUID(), productId, period: `${start} - ${end}`, markdown, content, createdAt: new Date().toISOString() });
    return this.db.client.report.create({ data: { productId, experimentId: input.experimentId, periodStart: input.periodStart, periodEnd: input.periodEnd, createdBy: user.id, updatedBy: user.id, versions: { create: { versionNumber: 1, content: content as unknown as Prisma.InputJsonValue, markdown, createdBy: user.id } } }, include: { versions: true } });
  }
  @Get('reports/:id/export/markdown') @Header('Content-Type', 'text/markdown; charset=utf-8') async export(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Res() response: Response) { const report = this.demo.enabled && !this.db.available ? user.shopIds.map((shopId) => this.demoState.find<{ id: string; productId: string; markdown: string }>(shopId, 'reports', id)).find(Boolean) : await this.db.client.report.findUniqueOrThrow({ where: { id }, include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } } }); if (!report) throw new NotFoundException('报告不存在'); await this.products.get(user, report.productId); response.setHeader('Content-Disposition', `attachment; filename="report-${id}.md"`); response.send('markdown' in report ? report.markdown : report.versions[0].markdown); }
  private markdown(name: string, input: CreateReportDto, totals: object, calculated: object, insights: { observations: string[]; limitations: string[]; actions: string[] }, days: number) { return `# ${name} 经营复盘\n\n统计周期：${input.periodStart.toISOString().slice(0, 10)} 至 ${input.periodEnd.toISOString().slice(0, 10)}\n\n## 数据概览\n\n\`\`\`json\n${JSON.stringify({ totals, calculated }, null, 2)}\n\`\`\`\n\n## 描述性观察\n\n${insights.observations.map((v) => `- ${v}`).join('\n')}\n\n## 数据限制\n\n${days ? insights.limitations.map((v) => `- ${v}`).join('\n') : '- 数据不足，无法形成可靠分析。'}\n\n## 下一步行动\n\n${insights.actions.map((v) => `- ${v}`).join('\n')}\n`; }
}
