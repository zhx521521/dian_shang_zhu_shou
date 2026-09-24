import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { DemoModeService } from '../../demo-mode.service';
import { ShopAccessService } from '../../common/guards/shop-access.service';

@Module({ controllers: [ProductsController], providers: [ProductsService, DemoModeService, ShopAccessService], exports: [ProductsService] })
export class ProductsModule {}
