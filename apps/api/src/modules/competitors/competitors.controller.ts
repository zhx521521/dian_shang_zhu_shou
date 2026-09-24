import { AuthenticatedUser } from '@eoa/contracts';
import { Prisma } from '@eoa/database';
import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { DatabaseService } from '../../database.service';
import { ProductsService } from '../products/products.service';
import { CreateCompetitorDto } from './competitors.dto';
import { DemoModeService } from '../../demo-mode.service';
import { DemoStateService } from '../demo-state/demo-state.service';

@ApiTags('competitors')
@ApiBearerAuth()
@Controller('products/:productId/competitors')
export class CompetitorsController {
  constructor(
    private readonly db: DatabaseService,
    private readonly products: ProductsService,
    private readonly demo: DemoModeService,
    private readonly demoState: DemoStateService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser, @Param('productId', ParseUUIDPipe) productId: string) {
    const product = await this.products.get(user, productId);
    if (this.demo.enabled && !this.db.available) {
      return this.demoState.list<{ productId: string }>(String(product.shopId), 'competitors').filter((item) => item.productId === productId);
    }
    return this.db.client.competitor.findMany({ where: { productId, archivedAt: null }, orderBy: { createdAt: 'desc' } });
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() input: CreateCompetitorDto,
  ) {
    await this.products.get(user, productId);
    if (this.demo.enabled && !this.db.available) {
      const product = this.demo.findProduct(productId);
      const competitor = {
        id: crypto.randomUUID(), productId, name: input.name, platform: input.platform,
        sourceUrl: input.sourceUrl, price: input.price, parameters: input.parameters,
        sellingPoints: input.sellingPoints, collectedAt: input.collectedAt.toISOString(),
        createdAt: new Date().toISOString(),
      };
      if (!product) throw new Error('Demo product not found');
      return this.demoState.create(product.shopId, 'competitors', competitor);
    }
    return this.db.client.competitor.create({
      data: { ...input, parameters: input.parameters as Prisma.InputJsonValue, sellingPoints: input.sellingPoints as Prisma.InputJsonValue, productId, createdBy: user.id, updatedBy: user.id },
    });
  }
}
