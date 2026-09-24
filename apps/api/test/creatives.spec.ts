import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '@eoa/contracts';
import type { DatabaseService } from '../src/database.service';
import type { LlmProvider } from '../src/integrations/llm/llm.provider';
import type { ProductsService } from '../src/modules/products/products.service';
import type { DemoModeService } from '../src/demo-mode.service';
import type { DemoStateService } from '../src/modules/demo-state/demo-state.service';
import { CreativesService } from '../src/modules/creatives/creatives.service';

describe('CreativesService database responses', () => {
  it('returns version ids and task-compatible creative types', async () => {
    const imagePlan = { name: 'Image direction', copy: 'Example copy' };
    const videoScript = { name: 'Video direction', openingHook: 'Example hook' };
    const createdProjects: Array<Record<string, unknown>> = [];
    const creativeProject = {
      create: vi.fn(({ data }: { data: Record<string, any> }) => {
        const versionId = `version-${createdProjects.length + 1}`;
        const project = {
          id: `project-${createdProjects.length + 1}`,
          productId: 'product-1',
          type: data.type,
          name: data.name,
          versions: [{ id: versionId, content: data.versions.create.content, confirmedAt: null }],
        };
        createdProjects.push(project);
        return Promise.resolve(project);
      }),
      findMany: vi.fn(async () => createdProjects),
    };
    const db = {
      available: true,
      client: {
        diagnosisRun: { findUnique: vi.fn(async () => ({ id: 'diagnosis-1', productId: 'product-1', status: 'confirmed', versions: [{ content: {} }] })) },
        creativeProject,
        creativeVersion: {
          findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({
            id: where.id,
            content: imagePlan,
            creativeProject: { productId: 'product-1', name: 'Image direction', type: 'image_plan' },
          })),
          update: vi.fn(async ({ where }: { where: { id: string } }) => ({ id: where.id, content: imagePlan, confirmedAt: new Date() })),
        },
        $transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
      },
    } as unknown as DatabaseService;
    const products = { get: vi.fn(async () => ({ id: 'product-1', shopId: 'shop-1' })) } as unknown as ProductsService;
    const llm = { generateCreatives: vi.fn(async () => ({ imagePlans: [imagePlan], videoScripts: [videoScript] })) } as unknown as LlmProvider;
    const demo = { enabled: false } as DemoModeService;
    const demoState = {} as DemoStateService;
    const service = new CreativesService(db, products, llm, demo, demoState);
    const user = { id: 'user-1', shopIds: ['shop-1'], roles: [] } as unknown as AuthenticatedUser;

    const generated = await service.create(user, 'diagnosis-1');

    expect(generated).toMatchObject([
      { id: 'version-1', projectId: 'project-1', type: 'image', status: 'draft', title: 'Image direction' },
      { id: 'version-2', projectId: 'project-2', type: 'video', status: 'draft', title: 'Video direction' },
    ]);
    expect(generated.every((item) => typeof item.content === 'string')).toBe(true);

    const confirmed = await service.confirm(user, 'version-1');
    expect(confirmed).toMatchObject({ id: 'version-1', type: 'image', status: 'confirmed', title: 'Image direction' });
    expect(confirmed.content).toBe(JSON.stringify(imagePlan, null, 2));

    const listed = await service.list(user, 'product-1');
    expect(listed).toMatchObject([
      { id: 'version-1', type: 'image' },
      { id: 'version-2', type: 'video' },
    ]);
  });
});
