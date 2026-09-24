import { prisma } from '@eoa/database';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  available = false;
  readonly client = prisma;
  async onModuleInit() {
    try {
      await this.client.$connect();
      await this.client.$queryRaw`SELECT 1`;
      this.available = true;
    } catch (error) {
      this.available = false;
      console.warn('[database] unavailable; demo fallback may be used', String(error));
    }
  }
  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
