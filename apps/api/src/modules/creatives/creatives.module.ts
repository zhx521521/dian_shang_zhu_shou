import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { CreativesController } from './creatives.controller';
import { CreativesService } from './creatives.service';
@Module({ imports: [ProductsModule], controllers: [CreativesController], providers: [CreativesService] })
export class CreativesModule {}
