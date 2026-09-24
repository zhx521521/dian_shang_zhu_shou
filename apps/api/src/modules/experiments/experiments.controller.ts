import { AuthenticatedUser, RoleCode } from '@eoa/contracts';
import { Prisma } from '@eoa/database';
import { BadRequestException, Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { DatabaseService } from '../../database.service';
import { ProductsService } from '../products/products.service';
import { ApproveExperimentDto, CreateExperimentDto, RejectExperimentDto } from './experiments.dto';
import { DemoModeService } from '../../demo-mode.service';
import { DemoStateService } from '../demo-state/demo-state.service';
@ApiTags('experiments') @ApiBearerAuth() @Controller()
export class ExperimentsController {
  constructor(private readonly db: DatabaseService, private readonly products: ProductsService, private readonly demo: DemoModeService, private readonly demoState: DemoStateService) {}
  @Post('products/:productId/experiments') async create(@CurrentUser() user: AuthenticatedUser, @Param('productId', ParseUUIDPipe) productId: string, @Body() input: CreateExperimentDto) {
    const product = await this.products.get(user, productId);
    if (this.demo.enabled && !this.db.available) return this.demoState.create(String(product.shopId), 'experiments', { id: crypto.randomUUID(), productId, status: 'draft', currentVersion: 1, content: input.content, title: String(input.content.title ?? '投放实验建议'), budget: Number(input.content.budget ?? 0), createdAt: new Date().toISOString() });
    return this.db.client.experiment.create({ data: { productId, createdBy: user.id, updatedBy: user.id, versions: { create: { versionNumber: 1, content: input.content as Prisma.InputJsonValue, createdBy: user.id } } }, include: { versions: true } });
  }
  @Get('products/:productId/experiments') async list(@CurrentUser() user: AuthenticatedUser, @Param('productId', ParseUUIDPipe) productId: string) {
    const product = await this.products.get(user, productId);
    if (this.demo.enabled && !this.db.available) return this.demoState.list<{ productId: string }>(String(product.shopId), 'experiments').filter((item) => item.productId === productId);
    return this.db.client.experiment.findMany({ where: { productId }, include: { versions: true, approvals: true }, orderBy: { createdAt: 'desc' } });
  }
  @Post('experiments/:id/submit') async submit(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    const experiment = await this.requireExperiment(user, id);
    if (!['draft', 'rejected'].includes(experiment.status)) throw new BadRequestException('当前状态不可提交');
    if (this.demo.enabled && !this.db.available) return this.demoState.update<{ id: string; productId: string; status: string }>(user.shopIds[0], 'experiments', id, { status: 'pending_approval', submittedAt: new Date().toISOString() });
    return this.db.client.experiment.update({ where: { id }, data: { status: 'pending_approval', updatedBy: user.id, versions: { update: { where: { experimentId_versionNumber: { experimentId: id, versionNumber: experiment.currentVersion } }, data: { submittedAt: new Date() } } } } });
  }
  @Post('experiments/:id/approve') @Roles(RoleCode.SUPERVISOR, RoleCode.ADMIN)
  approve(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() input: ApproveExperimentDto) { return this.review(user, id, 'approved', input.comment); }
  @Post('experiments/:id/reject') @Roles(RoleCode.SUPERVISOR, RoleCode.ADMIN)
  reject(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() input: RejectExperimentDto) { return this.review(user, id, 'rejected', input.comment); }
  private async review(user: AuthenticatedUser, id: string, decision: 'approved' | 'rejected', comment?: string) { const experiment = await this.requireExperiment(user, id); if (experiment.status !== 'pending_approval') throw new BadRequestException('只有待审批建议可以审核'); if (decision === 'rejected' && !comment?.trim()) throw new BadRequestException('驳回时必须填写原因'); if (this.demo.enabled && !this.db.available) return this.demoState.update<{ id: string; productId: string; status: string }>(user.shopIds[0], 'experiments', id, { status: decision, reviewComment: comment, reviewedBy: user.id, reviewedAt: new Date().toISOString() }); const version = experiment.versions.find((v) => v.versionNumber === experiment.currentVersion)!; return this.db.client.$transaction([this.db.client.experiment.update({ where: { id }, data: { status: decision, updatedBy: user.id } }), this.db.client.experimentApproval.create({ data: { experimentId: id, experimentVersionId: version.id, decision, comment, reviewerId: user.id } })]); }
  private async requireExperiment(user: AuthenticatedUser, id: string) { if (this.demo.enabled && !this.db.available) { const experiment = user.shopIds.map((shopId) => this.demoState.find<{ id: string; productId: string; status: string; currentVersion: number; versions: Array<{ versionNumber: number; id: string }> }>(shopId, 'experiments', id)).find(Boolean); if (!experiment) throw new NotFoundException('投放建议不存在'); await this.products.get(user, experiment.productId); return { ...experiment, versions: experiment.versions ?? [] }; } const experiment = await this.db.client.experiment.findUniqueOrThrow({ where: { id }, include: { versions: true } }); await this.products.get(user, experiment.productId); return experiment; }
}
