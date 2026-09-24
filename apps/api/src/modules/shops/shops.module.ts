import { Module } from '@nestjs/common';
import { ShopsController } from './shops.controller';
import { DemoModeService } from '../../demo-mode.service';

@Module({ controllers: [ShopsController], providers: [DemoModeService] })
export class ShopsModule {}
