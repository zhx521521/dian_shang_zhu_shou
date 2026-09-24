import { AuthenticatedUser } from '@eoa/contracts';
import { Prisma } from '@eoa/database';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { LLM_PROVIDER, LlmProvider } from '../../integrations/llm/llm.provider';
import { DatabaseService } from '../../database.service';
import { ProductsService } from '../products/products.service';
import { DemoModeService } from '../../demo-mode.service';
import { DemoStateService } from '../demo-state/demo-state.service';

@Injectable()
export class DiagnosisService {
  constructor(
    private readonly db: DatabaseService,
    private readonly products: ProductsService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
    private readonly demo: DemoModeService,
    private readonly demoState: DemoStateService,
  ) {}

  async create(user: AuthenticatedUser, productId: string) {
    const product = await this.products.get(user, productId);
    const snapshot = { product, generatedAt: new Date().toISOString() };
    if (this.demo.enabled && !this.db.available) {
      const shopId = String(product.shopId);
      const stateCompetitors = this.demoState.list<{ productId: string }>(shopId, 'competitors')
        .filter((item) => item.productId === productId);
      if (!product.competitors.length && !stateCompetitors.length) {
        throw new BadRequestException('至少录入一个竞品后才能生成诊断');
      }
      const content = await this.llm.diagnoseProduct({
        ...snapshot,
        competitors: [...(product.competitors ?? []), ...stateCompetitors],
      });
      const diagnosis = {
        id: crypto.randomUUID(), productId, status: 'generated' as const,
        createdAt: new Date().toISOString(), summary: content.optimizationDirections.join('；'), content,
        modelName: this.llm.name, inputSnapshot: snapshot,
      };
      return this.demoState.create(shopId, 'diagnoses', diagnosis);
    }
    if (!product.competitors.length) throw new BadRequestException('至少录入一个竞品后才能生成诊断');
    const run = await this.db.client.diagnosisRun.create({
      data: {
        productId,
        inputSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        modelName: this.llm.name,
        promptVersion: 'diagnosis-v1',
        createdBy: user.id,
        updatedBy: user.id,
      },
    });
    try {
      const content = await this.llm.diagnoseProduct(snapshot);
      return await this.db.client.diagnosisRun.update({
        where: { id: run.id },
        data: {
          status: 'generated',
          versions: { create: { versionNumber: 1, source: 'ai', content: content as unknown as Prisma.InputJsonValue, createdBy: user.id } },
        },
        include: { versions: true },
      });
    } catch (error) {
      await this.db.client.diagnosisRun.update({
        where: { id: run.id },
        data: { status: 'generation_failed', errorCode: 'LLM_FAILED', errorMessage: String(error) },
      });
      throw error;
    }
  }

  async list(user: AuthenticatedUser, productId: string) {
    const product = await this.products.get(user, productId);
    if (this.demo.enabled && !this.db.available) {
      return this.demoState.list<{ productId: string }>(String(product.shopId), 'diagnoses')
        .filter((item) => item.productId === productId);
    }
    return this.db.client.diagnosisRun.findMany({ where: { productId }, include: { versions: true }, orderBy: { createdAt: 'desc' } });
  }

  async confirm(user: AuthenticatedUser, id: string) {
    if (this.demo.enabled && !this.db.available) {
      const diagnosis = this.demoState.find<{ id: string; productId: string; status: string }>(
        user.shopIds[0], 'diagnoses', id,
      );
      if (!diagnosis) throw new NotFoundException('诊断不存在');
      await this.products.get(user, diagnosis.productId);
      if (diagnosis.status !== 'generated') throw new BadRequestException('只有已生成的诊断可以确认');
      return this.demoState.update<{ id: string; productId: string; status: string; confirmedAt?: string }>(user.shopIds[0], 'diagnoses', id, { status: 'confirmed', confirmedAt: new Date().toISOString() });
    }
    const run = await this.db.client.diagnosisRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException('诊断不存在');
    await this.products.get(user, run.productId);
    if (run.status !== 'generated') throw new BadRequestException('只有已生成的诊断可以确认');
    return this.db.client.diagnosisRun.update({ where: { id }, data: { status: 'confirmed', confirmedAt: new Date(), updatedBy: user.id } });
  }
}
