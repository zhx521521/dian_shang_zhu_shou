import 'dotenv/config';
import { prisma } from '@eoa/database';
import { startTaskWorker } from './task.worker';
import { startTimeoutMonitor } from './timeout.worker';

async function main() {
  await prisma.$connect();
  const worker = startTaskWorker();
  const monitor = startTimeoutMonitor();
  worker.on('failed', (job, error) => console.error('Queue job failed', { jobId: job?.id, error: error.message }));
  const shutdown = async () => {
    clearInterval(monitor);
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  console.log('Media generation worker started');
}
void main();
