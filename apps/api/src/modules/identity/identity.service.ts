import { AuthenticatedUser, RoleCode } from '@eoa/contracts';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { DatabaseService } from '../../database.service';
import { DemoModeService } from '../../demo-mode.service';
import { LoginDto } from './identity.dto';

@Injectable()
export class IdentityService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
    private readonly demo: DemoModeService,
  ) {}

  async login(input: LoginDto) {
    if (this.demo.enabled && !this.db.available) {
      const demoUser = this.demo.user(input.username);
      if (demoUser && input.password === 'Demo@123456') return { accessToken: await this.jwt.signAsync(demoUser, { subject: demoUser.id }), user: demoUser };
      throw new UnauthorizedException('演示账号或密码错误');
    }
    const user = await this.db.client.user.findUnique({
      where: { username: input.username },
      include: { roles: { include: { role: true } }, shopPermissions: true },
    });
    const now = new Date();
    if (!user || !user.active || (user.lockedUntil && user.lockedUntil > now)) {
      throw new UnauthorizedException('账号或密码错误，或账号暂时锁定');
    }
    if (!(await compare(input.password, user.passwordHash))) {
      const failedLogins = user.failedLogins + 1;
      await this.db.client.user.update({
        where: { id: user.id },
        data: {
          failedLogins,
          lockedUntil: failedLogins >= 5 ? new Date(Date.now() + 15 * 60_000) : null,
        },
      });
      throw new UnauthorizedException('账号或密码错误，或账号暂时锁定');
    }
    await this.db.client.user.update({
      where: { id: user.id },
      data: { failedLogins: 0, lockedUntil: null, lastLoginAt: now },
    });
    const profile: AuthenticatedUser = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      roles: user.roles.map(({ role }) => role.code as RoleCode),
      shopIds: user.shopPermissions.map(({ shopId }) => shopId),
    };
    return { accessToken: await this.jwt.signAsync(profile, { subject: user.id }), user: profile };
  }
}
