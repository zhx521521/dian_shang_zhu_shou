import { RoleCode } from '@eoa/contracts';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

export const DEMO_OPERATOR_ID = '00000000-0000-4000-8000-000000000001';
export const DEMO_SUPERVISOR_ID = '00000000-0000-4000-8000-000000000002';
export const DEMO_ADMIN_ID = '00000000-0000-4000-8000-000000000003';
export const DEMO_SHOP_ID = '00000000-0000-4000-8000-000000000010';
export const DEMO_PRODUCT_ID = '00000000-0000-4000-8000-000000000020';

type DemoProduct = {
  id: string;
  shopId: string;
  name: string;
  category: string;
  brand: string;
  status: string;
  version: number;
  competitors: Array<{ id: string; name: string; platform: string }>;
  platformMappings: unknown[];
  skus: Array<Record<string, unknown>>;
};

@Injectable()
export class DemoModeService {
  readonly enabled: boolean;
  private readonly products: DemoProduct[];
  constructor(config: ConfigService) {
    this.enabled = config.get<string>('DEMO_MODE', 'false') === 'true';
    this.products = [this.product()];
  }
  user(username: string) {
    const users: Record<string, { id: string; username: string; displayName: string; roles: RoleCode[] }> = {
      operator: { id: DEMO_OPERATOR_ID, username: 'operator', displayName: '运营演示账号', roles: [RoleCode.OPERATOR] },
      supervisor: { id: DEMO_SUPERVISOR_ID, username: 'supervisor', displayName: '主管演示账号', roles: [RoleCode.SUPERVISOR] },
      admin: { id: DEMO_ADMIN_ID, username: 'admin', displayName: '管理员演示账号', roles: [RoleCode.ADMIN] },
    };
    const profile = users[username];
    return profile ? { ...profile, shopIds: [DEMO_SHOP_ID] } : undefined;
  }
  shop() { return { id: DEMO_SHOP_ID, platform: 'tmall', code: 'DEMO-TMALL', name: '演示旗舰店', active: true }; }
  product(): DemoProduct { return { id: DEMO_PRODUCT_ID, shopId: DEMO_SHOP_ID, name: '夏季轻薄防晒衣（演示商品）', category: '服饰', brand: 'EOA Demo', status: 'active', version: 1, competitors: [{ id: '00000000-0000-4000-8000-000000000030', name: '演示竞品', platform: 'tmall' }], platformMappings: [], skus: [{ id: '00000000-0000-4000-8000-000000000021', code: 'DEMO-BLUE-M', availableStock: 48, warningStock: 10 }, { id: '00000000-0000-4000-8000-000000000022', code: 'DEMO-BLUE-L', availableStock: 8, warningStock: 10 }] }; }
  listProducts() { return this.products.map((product) => structuredClone(product)); }
  findProduct(id: string) { const product = this.products.find((item) => item.id === id); return product ? structuredClone(product) : undefined; }
  createProduct(input: { shopId: string; name: string; category: string; brand: string; status: string; skus: Array<Record<string, unknown>> }) : DemoProduct {
    const product = {
      id: crypto.randomUUID(),
      shopId: input.shopId,
      name: input.name,
      category: input.category,
      brand: input.brand,
      status: input.status,
      version: 1,
      competitors: [],
      platformMappings: [],
      skus: input.skus.map((sku, index) => ({ id: crypto.randomUUID(), ...sku, code: sku.code ?? `SKU-${index + 1}` })),
    };
    this.products.unshift(product);
    return structuredClone(product);
  }
}
