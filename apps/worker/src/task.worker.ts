import { TASK_QUEUE } from '@eoa/contracts';
import { prisma } from '@eoa/database';
import { Prisma } from '@prisma/client';
import { Job, Worker } from 'bullmq';
import { MockMediaProvider } from './media.provider';
import { ObjectStorage } from './storage';

function redisConnection(urlValue: string) {
  const url = new URL(urlValue);
  return { host: url.hostname, port: Number(url.port || 6379), username: url.username || undefined, password: url.password || undefined, db: Number(url.pathname.slice(1) || 0) };
}

export function startTaskWorker() {
  const provider = new MockMediaProvider();
  const storage = new ObjectStorage();
  return new Worker<{ taskId: string }>(TASK_QUEUE, async (job: Job<{ taskId: string }>) => {
    const task = await prisma.generationTask.findUniqueOrThrow({ where: { id: job.data.taskId }, include: { attempts: true } });
    if (task.status === 'cancelling') {
      await prisma.generationTask.update({ where: { id: task.id }, data: { status: 'cancelled', completedAt: new Date() } });
      return;
    }
    const attemptNumber = task.attempts.length + 1;
    const attempt = await prisma.generationAttempt.create({ data: { taskId: task.id, attemptNumber, status: 'running', requestPayload: task.payload as Prisma.InputJsonValue } });
    await prisma.generationTask.update({ where: { id: task.id }, data: { status: 'running', startedAt: new Date(), provider: provider.name } });
    try {
      const media = await provider.generate(task.type, task.payload as Record<string, unknown>);
      const latest = await prisma.generationTask.findUniqueOrThrow({ where: { id: task.id } });
      if (latest.status === 'cancelling') {
        await prisma.$transaction([
          prisma.generationAttempt.update({ where: { id: attempt.id }, data: { status: 'cancelled', completedAt: new Date() } }),
          prisma.generationTask.update({ where: { id: task.id }, data: { status: 'cancelled', completedAt: new Date() } }),
        ]);
        return;
      }
      const key = `${task.productId}/${task.id}/${attemptNumber}.${media.extension}`;
      await storage.put(key, media);
      await prisma.$transaction(async (tx) => {
        await tx.generationAttempt.update({ where: { id: attempt.id }, data: { status: 'succeeded', responsePayload: media.metadata as Prisma.InputJsonValue, completedAt: new Date() } });
        await tx.asset.create({ data: { productId: task.productId, taskId: task.id, type: task.type, status: 'draft', title: `生成素材 ${task.id.slice(0, 8)}`, tags: ['AI生成', '待审核'], createdBy: task.createdBy, updatedBy: task.createdBy, versions: { create: { versionNumber: 1, storageKey: key, mimeType: media.mimeType, sizeBytes: media.bytes.length, width: typeof media.metadata.width === 'number' ? media.metadata.width : undefined, height: typeof media.metadata.height === 'number' ? media.metadata.height : undefined, metadata: media.metadata as Prisma.InputJsonValue, createdBy: task.createdBy } } } });
        await tx.generationTask.update({ where: { id: task.id }, data: { status: 'succeeded', completedAt: new Date(), errorCode: null, errorMessage: null } });
      });
    } catch (error) {
      const timedOut = String(error).includes('TIMEOUT');
      const status = timedOut ? 'timed_out' : 'failed';
      await prisma.$transaction([
        prisma.generationAttempt.update({ where: { id: attempt.id }, data: { status, errorCode: timedOut ? 'PROVIDER_TIMEOUT' : 'PROVIDER_FAILED', errorMessage: String(error), completedAt: new Date() } }),
        prisma.generationTask.update({ where: { id: task.id }, data: { status, errorCode: timedOut ? 'PROVIDER_TIMEOUT' : 'PROVIDER_FAILED', errorMessage: String(error), completedAt: new Date() } }),
      ]);
    }
  }, { connection: redisConnection(process.env.REDIS_URL ?? 'redis://localhost:6379'), concurrency: Number(process.env.WORKER_CONCURRENCY ?? 2) });
}
