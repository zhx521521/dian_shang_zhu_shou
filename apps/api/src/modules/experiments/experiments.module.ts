import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { ExperimentsController } from './experiments.controller';
@Module({ imports: [ProductsModule], controllers: [ExperimentsController] })
export class ExperimentsModule {}
