import { prisma } from '@eoa/database';

export function startTimeoutMonitor() {
  return setInterval(async () => {
    const running = await prisma.generationTask.findMany({ where: { status: 'running', startedAt: { not: null } } });
    const now = Date.now();
    await Promise.all(running.filter((task) => task.startedAt && now - task.startedAt.getTime() > task.timeoutSeconds * 1000).map((task) => prisma.generationTask.update({ where: { id: task.id }, data: { status: 'timed_out', completedAt: new Date(), errorCode: 'TASK_TIMEOUT', errorMessage: '任务超过配置的执行时限' } })));
    const cancelling = await prisma.generationTask.findMany({ where: { status: 'cancelling', updatedAt: { lt: new Date(now - 30_000) } } });
    await Promise.all(cancelling.map((task) => prisma.generationTask.update({ where: { id: task.id }, data: { status: 'cancelled', completedAt: new Date() } })));
  }, 5_000);
}
