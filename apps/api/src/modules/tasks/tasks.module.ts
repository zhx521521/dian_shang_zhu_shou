import { TASK_QUEUE } from '@eoa/contracts';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { DemoModeService } from '../../demo-mode.service';
@Module({ imports: [BullModule.registerQueue({ name: TASK_QUEUE }), ProductsModule], controllers: [TasksController], providers: [TasksService, DemoModeService] })
export class TasksModule {}
