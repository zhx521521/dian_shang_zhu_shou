import { AuthenticatedUser } from '@eoa/contracts';
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { CreativesService } from './creatives.service';
import { UpdateCreativeDto } from './creatives.dto';

@ApiTags('creatives') @ApiBearerAuth() @Controller()
export class CreativesController {
  constructor(private readonly service: CreativesService) {}
  @Get('products/:productId/creatives') list(@CurrentUser() user: AuthenticatedUser, @Param('productId', ParseUUIDPipe) id: string) { return this.service.list(user, id); }
  @Post('diagnoses/:id/creatives') create(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.service.create(user, id); }
  @Post('creative-versions/:id/confirm') confirm(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.service.confirm(user, id); }
  @Patch('creatives/:id') update(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() input: UpdateCreativeDto) { return this.service.update(user, id, input.content); }
}
