import { AuthenticatedUser } from '@eoa/contracts';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database.service';
import { LLM_PROVIDER, LlmProvider } from '../../integrations/llm/llm.provider';
import { ProductsService } from '../products/products.service';
import { DemoModeService } from '../../demo-mode.service';
import { DemoStateService } from '../demo-state/demo-state.service';
import { Prisma } from '@eoa/database';

type CreativeResponse = {
  id: string;
  projectId?: string;
  productId: string;
  diagnosisId?: string;
  title?: string;
  name?: string;
  type: 'image' | 'video';
  status: 'draft' | 'confirmed';
  content: string;
  versions?: Array<{ id?: string; content?: unknown; confirmedAt?: Date | null }>;
};

@Injectable()
export class CreativesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly products: ProductsService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
    private readonly demo: DemoModeService,
    private readonly demoState: DemoStateService,
  ) {}

  private formatCreative(project: {
    id: string;
    productId: string;
    type: string;
    name: string;
    versions: Array<{ id: string; content: unknown; confirmedAt: Date | null }>;
  }): CreativeResponse {
    const version = project.versions[0];
    const rawContent = version?.content;
    const content = typeof rawContent === 'string'
      ? rawContent
      : rawContent && typeof rawContent === 'object' && 'text' in rawContent && typeof rawContent.text === 'string'
        ? rawContent.text
        : JSON.stringify(rawContent ?? '', null, 2);
    return {
      id: version?.id ?? project.id,
      projectId: project.id,
      productId: project.productId,
      title: project.name,
      type: project.type === 'video_script' ? 'video' as const : 'image' as const,
      status: version?.confirmedAt ? 'confirmed' as const : 'draft' as const,
      content,
      versions: project.versions,
    };
  }

  async create(user: AuthenticatedUser, diagnosisId: string): Promise<CreativeResponse[]> {
    if (this.demo.enabled && !this.db.available) {
      const diagnosis = user.shopIds.map((shopId) => this.demoState.find<{ id: string; productId: string; status: string; content?: unknown }>(shopId, 'diagnoses', diagnosisId)).find(Boolean);
      if (!diagnosis) throw new NotFoundException('诊断不存在');
      const product = await this.products.get(user, diagnosis.productId);
      if (!['generated', 'confirmed'].includes(diagnosis.status)) throw new BadRequestException('诊断尚不可用于生成创意');
      const content = await this.llm.generateCreatives(diagnosis.content);
      const shopId = String(product.shopId);
      const creatives = [
        ...content.imagePlans.map((plan) => ({
          id: crypto.randomUUID(), productId: diagnosis.productId, diagnosisId: diagnosis.id,
          title: plan.name, type: 'image' as const, status: 'draft' as const,
          content: `${plan.copy}\n卖点：${plan.sellingPoint}\n构图：${plan.composition}\n视觉：${plan.visualElements.join('、')}`,
        })),
        ...content.videoScripts.map((script) => ({
          id: crypto.randomUUID(), productId: diagnosis.productId, diagnosisId: diagnosis.id,
          title: script.name, type: 'video' as const, status: 'draft' as const,
          content: `${script.openingHook}\n${script.shots.map((shot) => `${shot.sequence}. ${shot.visual} / ${shot.voiceover} / ${shot.subtitle}`).join('\n')}\n${script.callToAction}`,
        })),
      ];
      const existing = this.demoState.list<CreativeResponse>(shopId, 'creatives');
      this.demoState.save(shopId, { creatives: [...creatives, ...existing] });
      return creatives;
    }
    const diagnosis = await this.db.client.diagnosisRun.findUnique({ where: { id: diagnosisId }, include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } } });
    if (!diagnosis) throw new NotFoundException('诊断不存在');
    const product = await this.products.get(user, diagnosis.productId);
    if (!['generated', 'confirmed'].includes(diagnosis.status)) throw new BadRequestException('诊断尚不可用于生成创意');
    const content = await this.llm.generateCreatives(diagnosis.versions[0]?.content);
    const projects = await this.db.client.$transaction([
      ...content.imagePlans.map((plan, index) => this.db.client.creativeProject.create({ data: { productId: diagnosis.productId, diagnosisRunId: diagnosis.id, type: 'image_plan', name: plan.name, createdBy: user.id, updatedBy: user.id, versions: { create: { versionNumber: 1, source: 'ai', content: plan, createdBy: user.id } } }, include: { versions: true } })),
      ...content.videoScripts.map((script) => this.db.client.creativeProject.create({ data: { productId: diagnosis.productId, diagnosisRunId: diagnosis.id, type: 'video_script', name: script.name, createdBy: user.id, updatedBy: user.id, versions: { create: { versionNumber: 1, source: 'ai', content: script, createdBy: user.id } } }, include: { versions: true } })),
    ]);
    return projects.map((project) => this.formatCreative(project));
  }

  async list(user: AuthenticatedUser, productId: string): Promise<CreativeResponse[]> {
    const product = await this.products.get(user, productId);
    if (this.demo.enabled && !this.db.available) {
      return this.demoState.list<CreativeResponse>(String(product.shopId), 'creatives').filter((item) => item.productId === productId);
    }
    const projects = await this.db.client.creativeProject.findMany({ where: { productId }, include: { versions: { orderBy: { versionNumber: 'desc' } } }, orderBy: { createdAt: 'desc' } });
    return projects.map((project) => this.formatCreative(project));
  }

  async confirm(user: AuthenticatedUser, id: string): Promise<CreativeResponse> {
    if (this.demo.enabled && !this.db.available) {
      const creative = this.demoState.find<CreativeResponse>(user.shopIds[0], 'creatives', id);
      if (!creative) throw new NotFoundException('创意版本不存在');
      await this.products.get(user, creative.productId);
      if (creative.status !== 'draft') throw new BadRequestException('只有草稿创意可以确认');
      const confirmed = this.demoState.update<CreativeResponse>(user.shopIds[0], 'creatives', id, { status: 'confirmed' });
      if (!confirmed) throw new NotFoundException('创意版本不存在');
      return confirmed;
    }
    const version = await this.db.client.creativeVersion.findUnique({ where: { id }, include: { creativeProject: true } });
    if (!version) throw new NotFoundException('创意版本不存在');
    await this.products.get(user, version.creativeProject.productId);
    const confirmed = await this.db.client.creativeVersion.update({ where: { id }, data: { confirmedAt: new Date() } });
    return {
      ...confirmed,
      productId: version.creativeProject.productId,
      title: version.creativeProject.name,
      type: version.creativeProject.type === 'video_script' ? 'video' : 'image',
      status: 'confirmed',
      content: typeof confirmed.content === 'string' ? confirmed.content : JSON.stringify(confirmed.content ?? '', null, 2),
    };
  }

  async update(user: AuthenticatedUser, id: string, content: string): Promise<CreativeResponse> {
    if (this.demo.enabled && !this.db.available) {
      const creative = this.demoState.find<CreativeResponse & { history?: Array<{ content: string; createdAt: string }> }>(user.shopIds[0], 'creatives', id);
      if (!creative) throw new NotFoundException('创意版本不存在');
      await this.products.get(user, creative.productId);
      if (creative.status !== 'draft') throw new BadRequestException('已确认的创意不可编辑');
      const updated = this.demoState.update<CreativeResponse & { history?: Array<{ content: string; createdAt: string }> }>(user.shopIds[0], 'creatives', id, {
        content,
        history: [...(creative.history ?? []), { content: creative.content, createdAt: new Date().toISOString() }],
        updatedAt: new Date().toISOString(),
      });
      if (!updated) throw new NotFoundException('创意版本不存在');
      return updated;
    }
    const version = await this.db.client.creativeVersion.findUnique({ where: { id }, include: { creativeProject: true } });
    if (!version) throw new NotFoundException('创意版本不存在');
    await this.products.get(user, version.creativeProject.productId);
    const latest = await this.db.client.creativeVersion.findFirst({ where: { creativeProjectId: version.creativeProjectId }, orderBy: { versionNumber: 'desc' } });
    let value: Prisma.InputJsonValue;
    try { value = JSON.parse(content) as Prisma.InputJsonValue; } catch { value = { text: content }; }
    const next = await this.db.client.creativeVersion.create({ data: { creativeProjectId: version.creativeProjectId, versionNumber: (latest?.versionNumber ?? 0) + 1, source: 'manual', content: value, createdBy: user.id } });
    return { ...next, productId: version.creativeProject.productId, title: version.creativeProject.name, type: version.creativeProject.type === 'video_script' ? 'video' : 'image', status: 'draft', content };
  }
}
