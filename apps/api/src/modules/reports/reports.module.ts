import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { ReportsController } from './reports.controller';
@Module({ imports: [ProductsModule], controllers: [ReportsController] })
export class ReportsModule {}
