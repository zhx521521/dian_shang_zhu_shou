import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { AssetsController } from './assets.controller';
@Module({ imports: [ProductsModule], controllers: [AssetsController] })
export class AssetsModule {}
