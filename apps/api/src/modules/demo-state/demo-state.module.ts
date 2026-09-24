import { Global, Module } from '@nestjs/common';
import { DemoStateController } from './demo-state.controller';
import { DemoStateService } from './demo-state.service';
import { DemoModeService } from '../../demo-mode.service';

@Global()
@Module({ controllers: [DemoStateController], providers: [DemoStateService, DemoModeService], exports: [DemoStateService, DemoModeService] })
export class DemoStateModule {}
