import { AuthenticatedUser, RoleCode } from '@eoa/contracts';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { DatabaseService } from '../../database.service';
import { CreateShopDto } from './shops.dto';
import { DemoModeService } from '../../demo-mode.service';

@ApiTags('shops')
@ApiBearerAuth()
@Controller('shops')
export class ShopsController {
  constructor(private readonly db: DatabaseService, private readonly demo: DemoModeService) {}

  @Get('authorized')
  list(@CurrentUser() user: AuthenticatedUser) {
    if (this.demo.enabled && !this.db.available) return [this.demo.shop()];
    return this.db.client.shop.findMany({
      where: user.roles.includes(RoleCode.ADMIN)
        ? { archivedAt: null }
        : { id: { in: user.shopIds }, archivedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post()
  @Roles(RoleCode.ADMIN)
  create(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateShopDto) {
    return this.db.client.shop.create({
      data: { ...input, createdBy: user.id, updatedBy: user.id },
    });
  }
}
