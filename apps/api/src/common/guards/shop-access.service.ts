import { AuthenticatedUser, RoleCode } from '@eoa/contracts';
import { ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class ShopAccessService {
  assert(user: AuthenticatedUser, shopId: string) {
    if (user.roles.includes(RoleCode.ADMIN) || user.shopIds.includes(shopId)) return;
    throw new ForbiddenException('无权访问该店铺');
  }
}
