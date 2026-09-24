import { AuthenticatedUser, ProductStatus, RoleCode } from '@eoa/contracts';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ShopAccessService } from '../../common/guards/shop-access.service';
import { DatabaseService } from '../../database.service';
import { CreateProductDto, ProductQueryDto } from './products.dto';
import { DemoModeService } from '../../demo-mode.service';

@Injectable()
export class ProductsService {
  constructor(private readonly db: DatabaseService, private readonly access: ShopAccessService, private readonly demo: DemoModeService) {}

  list(user: AuthenticatedUser, query: ProductQueryDto) {
    if (this.demo.enabled && !this.db.available) {
      if (query.shopId) this.access.assert(user, query.shopId);
      return this.demo.listProducts().filter((product) =>
        (!query.shopId || product.shopId === query.shopId)
        && (user.roles.includes(RoleCode.ADMIN) || user.shopIds.includes(String(product.shopId)))
        && (!query.status || product.status === query.status)
        && (!query.keyword || String(product.name).toLocaleLowerCase().includes(query.keyword.toLocaleLowerCase()) || String(product.brand).toLocaleLowerCase().includes(query.keyword.toLocaleLowerCase())),
      );
    }
    if (query.shopId) this.access.assert(user, query.shopId);
    return this.db.client.product.findMany({
      where: {
        shopId: query.shopId ?? (user.roles.includes(RoleCode.ADMIN) ? undefined : { in: user.shopIds }),
        status: query.status,
        OR: query.keyword
          ? [
              { name: { contains: query.keyword, mode: 'insensitive' } },
              { brand: { contains: query.keyword, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: { skus: true, _count: { select: { competitors: true, assets: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async get(user: AuthenticatedUser, id: string) {
    if (this.demo.enabled && !this.db.available) {
      const product = this.demo.findProduct(id);
      if (product) {
        this.access.assert(user, String(product.shopId));
        return product;
      }
      throw new NotFoundException('商品不存在');
    }
    const product = await this.db.client.product.findUnique({
      where: { id },
      include: { skus: true, competitors: true, platformMappings: true },
    });
    if (!product) throw new NotFoundException('商品不存在');
    this.access.assert(user, product.shopId);
    return product;
  }

  create(user: AuthenticatedUser, input: CreateProductDto) {
    this.access.assert(user, input.shopId);
    if (this.demo.enabled && !this.db.available) {
      return this.demo.createProduct({
        shopId: input.shopId,
        name: input.name,
        category: input.category,
        brand: input.brand,
        status: input.status ?? ProductStatus.DRAFT,
        skus: input.skus.map((sku) => ({ ...sku })),
      });
    }
    return this.db.client.product.create({
      data: {
        shopId: input.shopId,
        name: input.name,
        category: input.category,
        brand: input.brand,
        ownerId: input.ownerId,
        mainImageUrl: input.mainImageUrl,
        status: input.status ?? ProductStatus.DRAFT,
        createdBy: user.id,
        updatedBy: user.id,
        skus: {
          create: input.skus.map((sku) => ({ ...sku, createdBy: user.id, updatedBy: user.id })),
        },
      },
      include: { skus: true },
    });
  }

  async archive(user: AuthenticatedUser, id: string) {
    const product = await this.get(user, id);
    return this.db.client.product.update({
      where: { id, version: product.version },
      data: {
        status: ProductStatus.ARCHIVED,
        archivedAt: new Date(),
        updatedBy: user.id,
        version: { increment: 1 },
      },
    });
  }
}
