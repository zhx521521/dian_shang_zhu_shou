import { AuthenticatedUser, RoleCode } from '@eoa/contracts';
import { BadRequestException, Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { DatabaseService } from '../../database.service';
import { ProductsService } from '../products/products.service';
import { RejectAssetDto, ReviewAssetDto } from './assets.dto';
import { DemoModeService } from '../../demo-mode.service';
import { DemoStateService } from '../demo-state/demo-state.service';
@ApiTags('assets') @ApiBearerAuth() @Controller()
export class AssetsController {
  constructor(private readonly db: DatabaseService, private readonly products: ProductsService, private readonly demo: DemoModeService, private readonly demoState: DemoStateService) {}
  @Get('products/:productId/assets') async list(@CurrentUser() user: AuthenticatedUser, @Param('productId', ParseUUIDPipe) productId: string) {
    const product = await this.products.get(user, productId);
    if (this.demo.enabled && !this.db.available) return this.demoState.list<{ productId: string }>(String(product.shopId), 'assets').filter((item) => item.productId === productId);
    return this.db.client.asset.findMany({ where: { productId }, include: { versions: true, reviews: true }, orderBy: { createdAt: 'desc' } });
  }
  @Post('assets/:id/submit-review') async submit(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    const asset = await this.requireAsset(user, id);
    if (asset.status !== 'draft' && asset.status !== 'rejected') throw new BadRequestException('只有草稿或驳回素材可以提交审核');
    if (this.demo.enabled && !this.db.available) return this.demoState.update<{ id: string; productId: string; status: string }>(user.shopIds[0], 'assets', id, { status: 'pending_review' });
    return this.db.client.asset.update({ where: { id: asset.id }, data: { status: 'pending_review', updatedBy: user.id } });
  }
  @Post('assets/:id/approve') @Roles(RoleCode.SUPERVISOR, RoleCode.ADMIN)
  async approve(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() input: ReviewAssetDto) { const asset = await this.requireAsset(user, id); if (asset.status !== 'pending_review') throw new BadRequestException('只有待审核素材可以批准'); if (this.demo.enabled && !this.db.available) return this.demoState.update<{ id: string; productId: string; status: string }>(user.shopIds[0], 'assets', id, { status: 'approved', reviewComment: input.comment }); return this.db.client.$transaction([this.db.client.asset.update({ where: { id }, data: { status: 'approved', updatedBy: user.id } }), this.db.client.assetReview.create({ data: { assetId: id, decision: 'approved', comment: input.comment, reviewerId: user.id } })]); }
  @Post('assets/:id/reject') @Roles(RoleCode.SUPERVISOR, RoleCode.ADMIN)
  async reject(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() input: RejectAssetDto) { const asset = await this.requireAsset(user, id); if (asset.status !== 'pending_review') throw new BadRequestException('只有待审核素材可以驳回'); if (this.demo.enabled && !this.db.available) return this.demoState.update<{ id: string; productId: string; status: string }>(user.shopIds[0], 'assets', id, { status: 'rejected', reviewComment: input.comment }); return this.db.client.$transaction([this.db.client.asset.update({ where: { id }, data: { status: 'rejected', updatedBy: user.id } }), this.db.client.assetReview.create({ data: { assetId: id, decision: 'rejected', comment: input.comment, reviewerId: user.id } })]); }
  private async requireAsset(user: AuthenticatedUser, id: string) { if (this.demo.enabled && !this.db.available) { const asset = user.shopIds.map((shopId) => this.demoState.find<{ id: string; productId: string; status: string }>(shopId, 'assets', id)).find(Boolean); if (!asset) throw new NotFoundException('素材不存在'); await this.products.get(user, asset.productId); return asset; } const asset = await this.db.client.asset.findUniqueOrThrow({ where: { id } }); await this.products.get(user, asset.productId); return asset; }
}
