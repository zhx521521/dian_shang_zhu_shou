import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { DiagnosisController } from './diagnosis.controller';
import { DiagnosisService } from './diagnosis.service';

@Module({ imports: [ProductsModule], controllers: [DiagnosisController], providers: [DiagnosisService] })
export class DiagnosisModule {}
