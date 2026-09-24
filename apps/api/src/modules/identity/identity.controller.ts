import { AuthenticatedUser } from '@eoa/contracts';
import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Public } from '../../common/auth/public.decorator';
import { LoginDto } from './identity.dto';
import { IdentityService } from './identity.service';

@ApiTags('identity')
@Controller()
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Public()
  @Post('auth/login')
  @HttpCode(200)
  login(@Body() input: LoginDto) {
    return this.identity.login(input);
  }

  @Post('auth/logout')
  @HttpCode(204)
  logout() {}

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
