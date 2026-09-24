import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { CompetitorsController } from './competitors.controller';

@Module({ imports: [ProductsModule], controllers: [CompetitorsController] })
export class CompetitorsModule {}
