import { AuthenticatedUser, RoleCode, TASK_QUEUE } from '@eoa/contracts';
import { Prisma } from '@eoa/database';
import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { DatabaseService } from '../../database.service';
import { ProductsService } from '../products/products.service';
import { CreateTaskDto } from './tasks.dto';
import { DemoModeService } from '../../demo-mode.service';
import { DemoStateService } from '../demo-state/demo-state.service';

type TaskRecord = {
  id: string;
  productId: string;
  status: string;
  type: string;
  attempts: unknown[];
  maxAttempts: number;
  errorMessage?: string | null;
  creativeVersionId?: string;
};

@Injectable()
export class TasksService {
  constructor(private readonly db: DatabaseService, private readonly products: ProductsService, private readonly demo: DemoModeService, private readonly demoState: DemoStateService, @InjectQueue(TASK_QUEUE) private readonly queue: Queue) {}
  async create(user: AuthenticatedUser, creativeVersionId: string, input: CreateTaskDto) {
    const product = await this.products.get(user, input.productId);
    if (this.demo.enabled && !this.db.available) {
      const creative = this.demoState.find<{ id: string; productId: string; status: string }>(String(product.shopId), 'creatives', creativeVersionId);
      if (!creative || creative.productId !== input.productId) throw new NotFoundException('创意版本不存在');
      if (creative.status !== 'confirmed') throw new BadRequestException('只有已确认的创意可以生成素材');
      const existing = this.demoState.list<{ idempotencyKey: string }>(String(product.shopId), 'tasks').find((item) => item.idempotencyKey === input.idempotencyKey);
      if (existing) return existing;
      const task = {
        id: crypto.randomUUID(), productId: input.productId, creativeVersionId, type: input.type,
        status: 'pending' as const, provider: 'mock-media', idempotencyKey: input.idempotencyKey,
        payload: input.payload, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        errorMessage: undefined as string | undefined,
      };
      const created = this.demoState.create(String(product.shopId), 'tasks', task);
      this.scheduleDemoTask(String(product.shopId), created.id, input.payload.scenario);
      return created;
    }
    const existing = await this.db.client.generationTask.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) return existing;
    const task = await this.db.client.generationTask.create({ data: { productId: input.productId, creativeVersionId, type: input.type, status: 'pending', provider: 'mock', payload: input.payload as Prisma.InputJsonValue, idempotencyKey: input.idempotencyKey, timeoutSeconds: input.type === 'image' ? 300 : 1800, createdBy: user.id, updatedBy: user.id } });
    await this.queue.add(input.type, { taskId: task.id }, { jobId: task.id, attempts: 1, removeOnComplete: 100, removeOnFail: 100 });
    return task;
  }
  list(user: AuthenticatedUser) {
    if (this.demo.enabled && !this.db.available) {
      return user.shopIds.flatMap((shopId) => this.demoState.list(shopId, 'tasks'));
    }
    return this.db.client.generationTask.findMany({ where: user.roles.includes(RoleCode.ADMIN) ? undefined : { product: { shopId: { in: user.shopIds } } }, orderBy: { createdAt: 'desc' }, take: 100, include: { attempts: true } });
  }
  async get(user: AuthenticatedUser, id: string): Promise<TaskRecord> {
    if (this.demo.enabled && !this.db.available) {
      const task = user.shopIds.map((shopId) => this.demoState.find<TaskRecord>(shopId, 'tasks', id)).find(Boolean);
      if (!task) throw new NotFoundException('任务不存在');
      await this.products.get(user, task.productId);
      return { ...task, attempts: task.attempts ?? [], maxAttempts: task.maxAttempts ?? 3 };
    }
    const task = await this.db.client.generationTask.findUnique({ where: { id }, include: { attempts: true, assets: true } }); if (!task) throw new NotFoundException('任务不存在'); await this.products.get(user, task.productId); return task as unknown as TaskRecord;
  }
  async cancel(user: AuthenticatedUser, id: string) {
    const task = await this.get(user, id);
    if (this.demo.enabled && !this.db.available) {
      if (!['pending', 'running'].includes(task.status)) throw new BadRequestException('当前状态不可取消');
      const requested = this.demoState.update<TaskRecord>(user.shopIds[0], 'tasks', id, { status: 'cancelling', updatedAt: new Date().toISOString() });
      setTimeout(() => {
        this.demoState.update<TaskRecord>(user.shopIds[0], 'tasks', id, { status: 'cancelled', completedAt: new Date().toISOString() });
      }, 250);
      return requested;
    }
    if (!['pending', 'running'].includes(task.status)) throw new BadRequestException('当前状态不可取消'); return this.db.client.generationTask.update({ where: { id }, data: { status: 'cancelling', cancelRequestedAt: new Date(), updatedBy: user.id } });
  }
  async retry(user: AuthenticatedUser, id: string) {
    const task = await this.get(user, id);
    if (this.demo.enabled && !this.db.available) {
      if (!['failed', 'timed_out'].includes(task.status)) throw new BadRequestException('仅失败或超时任务可重试');
      const retried = this.demoState.update<TaskRecord>(user.shopIds[0], 'tasks', id, { status: 'pending', errorMessage: undefined, updatedAt: new Date().toISOString() });
      const shopId = user.shopIds.find((value) => this.demoState.find<TaskRecord>(value, 'tasks', id));
      if (shopId) {
        const payload = this.demoState.find<TaskRecord & { payload?: Record<string, unknown> }>(shopId, 'tasks', id)?.payload;
        this.scheduleDemoTask(shopId, id, payload?.scenario);
      }
      return retried;
    }
    if (!['failed', 'timed_out'].includes(task.status)) throw new BadRequestException('仅失败或超时任务可重试'); if (task.attempts.length >= task.maxAttempts) throw new BadRequestException('已达到最大重试次数'); await this.db.client.generationTask.update({ where: { id }, data: { status: 'pending', errorCode: null, errorMessage: null, updatedBy: user.id } }); await this.queue.add(task.type, { taskId: id }); return { id, status: 'pending' };
  }

  private scheduleDemoTask(shopId: string, taskId: string, scenario: unknown) {
    const startedAt = new Date().toISOString();
    setTimeout(() => {
      const task = this.demoState.find<TaskRecord>(shopId, 'tasks', taskId);
      if (!task || task.status !== 'pending') return;
      this.demoState.update<TaskRecord>(shopId, 'tasks', taskId, { status: 'running', startedAt, updatedAt: new Date().toISOString() });
    }, 150);
    setTimeout(() => {
      const task = this.demoState.find<TaskRecord & { payload?: Record<string, unknown> }>(shopId, 'tasks', taskId);
      if (!task || !['pending', 'running'].includes(task.status)) return;
      const outcome = scenario ?? task.payload?.scenario ?? 'success';
      if (outcome === 'failed' || outcome === 'timed_out') {
        this.demoState.update<TaskRecord>(shopId, 'tasks', taskId, {
          status: outcome === 'timed_out' ? 'timed_out' : 'failed',
          errorMessage: outcome === 'timed_out' ? '模拟媒体服务超时' : '模拟媒体服务返回失败',
          completedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        });
        return;
      }
      const updated = this.demoState.update<TaskRecord>(shopId, 'tasks', taskId, {
        status: 'succeeded', completedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      if (updated) {
        this.demoState.create(shopId, 'assets', {
          id: crypto.randomUUID(), productId: updated.productId, taskId: updated.id,
          creativeVersionId: updated.creativeVersionId, title: `生成素材 ${updated.id.slice(0, 8)}`,
          type: updated.type, status: 'draft', createdAt: new Date().toISOString(),
          provider: 'mock-media', output: { mock: true, format: updated.type === 'image' ? 'image/png' : 'video/mp4' },
        });
      }
    }, 900);
  }

  async simulate(user: AuthenticatedUser, id: string, action: 'succeed' | 'fail' | 'timeout' | 'cancel') {
    const task = await this.get(user, id);
    if (!(this.demo.enabled && !this.db.available)) throw new BadRequestException('仅演示模式支持手动切换任务结果');
    if (action === 'cancel') return this.cancel(user, id);
    if (!['pending', 'running'].includes(task.status)) throw new BadRequestException('当前任务状态不可切换');
    const status = action === 'succeed' ? 'succeeded' : action === 'fail' ? 'failed' : 'timed_out';
    const errorMessage = action === 'fail' ? '演示失败：模拟服务返回错误' : action === 'timeout' ? '演示超时：任务超过配置时限' : undefined;
    const updated = this.demoState.update<TaskRecord & { type: 'image' | 'video'; creativeVersionId: string }>(user.shopIds[0], 'tasks', id, { status, errorMessage, completedAt: new Date().toISOString() });
    if (action === 'succeed' && updated) this.demoState.create(user.shopIds[0], 'assets', { id: crypto.randomUUID(), productId: updated.productId, taskId: updated.id, creativeVersionId: updated.creativeVersionId, title: `生成素材 ${updated.id.slice(0, 8)}`, type: updated.type, status: 'draft', createdAt: new Date().toISOString(), provider: 'mock-media' });
    return updated;
  }
}
