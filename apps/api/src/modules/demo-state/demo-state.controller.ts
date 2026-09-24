import { AuthenticatedUser, RoleCode } from '@eoa/contracts';
import { BadRequestException, Body, Controller, ForbiddenException, Get, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { DemoStateQueryDto, SaveDemoStateDto } from './demo-state.dto';
import { DemoStateService } from './demo-state.service';

@Controller('demo-state')
export class DemoStateController {
  constructor(private readonly state: DemoStateService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser, @Query() query: DemoStateQueryDto) {
    this.assertShopAccess(user, query.shopId);
    return this.state.get(query.shopId);
  }

  @Post()
  save(@CurrentUser() user: AuthenticatedUser, @Body() input: SaveDemoStateDto) {
    this.assertShopAccess(user, input.shopId);
    const current = this.state.get(input.shopId);
    const isReviewer = user.roles.some((role) => role === RoleCode.SUPERVISOR || role === RoleCode.ADMIN);
    const isAdmin = user.roles.includes(RoleCode.ADMIN);
    if (!isReviewer) {
      for (const key of ['assets', 'experiments']) {
        const existing = new Map(this.items(current[key]).map((item) => [item.id, item.status]));
        for (const item of this.items(input.state[key])) {
          const oldStatus = existing.get(item.id);
          if (oldStatus !== item.status && ['approved', 'rejected'].includes(String(item.status))) {
            throw new ForbiddenException('只有主管或管理员可以审批');
          }
        }
      }
    }
    if (!isAdmin && JSON.stringify(current.configs ?? []) !== JSON.stringify(input.state.configs ?? [])) {
      throw new ForbiddenException('只有管理员可以修改系统配置');
    }
    try {
      const state = !isAdmin && !Object.hasOwn(input.state, 'configs')
        ? { ...input.state, configs: current.configs ?? [] }
        : input.state;
      return this.state.save(input.shopId, state);
    } catch (error) {
      if (error instanceof Error && error.message.includes('exceeds')) throw new BadRequestException(error.message);
      throw error;
    }
  }

  private assertShopAccess(user: AuthenticatedUser, shopId: string) {
    if (!user.shopIds.includes(shopId)) throw new ForbiddenException('无权访问该店铺的演示数据');
  }

  private items(value: unknown): Array<{ id: string; status: string }> {
    return Array.isArray(value) ? value.filter((item): item is { id: string; status: string } => Boolean(item && typeof item === 'object' && 'id' in item && 'status' in item)) : [];
  }
}
