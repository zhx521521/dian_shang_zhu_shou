import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { MetricsController } from './metrics.controller';
@Module({ imports: [ProductsModule], controllers: [MetricsController] })
export class MetricsModule {}
