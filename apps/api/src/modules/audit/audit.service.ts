import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database.service';

export interface AuditEntry {
  actorId: string;
  action: string;
  objectType: string;
  objectId: string;
  requestId: string;
  shopId?: string;
  before?: object;
  after?: object;
  result?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly db: DatabaseService) {}

  write(entry: AuditEntry) {
    return this.db.client.auditLog.create({
      data: { ...entry, result: entry.result ?? 'success' },
    });
  }
}
