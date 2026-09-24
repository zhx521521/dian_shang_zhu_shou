import { Injectable } from '@nestjs/common';

@Injectable()
export class DemoStateService {
  private readonly byShop = new Map<string, Record<string, unknown>>();

  get(shopId: string) {
    return structuredClone(this.byShop.get(shopId) ?? {});
  }

  save(shopId: string, state: Record<string, unknown>) {
    const next = { ...(this.byShop.get(shopId) ?? {}), ...state };
    const encoded = JSON.stringify(next);
    if (Buffer.byteLength(encoded, 'utf8') > 1_000_000) {
      throw new Error('Demo state exceeds 1 MB');
    }
    this.byShop.set(shopId, structuredClone(next));
    return { shopId, saved: true, updatedAt: new Date().toISOString() };
  }

  list<T>(shopId: string, key: string): T[] {
    const value = this.get(shopId)[key];
    return Array.isArray(value) ? value as T[] : [];
  }

  create<T extends { id: string }>(shopId: string, key: string, item: T): T {
    const items = this.list<T>(shopId, key);
    this.save(shopId, { [key]: [item, ...items] });
    return structuredClone(item);
  }

  update<T extends { id: string }>(shopId: string, key: string, id: string, change: Record<string, unknown>): T | undefined {
    const items = this.list<T>(shopId, key);
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) return undefined;
    const updated = { ...items[index], ...change } as T;
    items[index] = updated;
    this.save(shopId, { [key]: items });
    return structuredClone(updated);
  }

  find<T extends { id: string }>(shopId: string, key: string, id: string): T | undefined {
    const item = this.list<T>(shopId, key).find((value) => value.id === id);
    return item ? structuredClone(item) : undefined;
  }
}
