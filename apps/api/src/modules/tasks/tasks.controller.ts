import { AuthenticatedUser } from '@eoa/contracts';
import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { CreateTaskDto, SimulateTaskDto } from './tasks.dto';
import { TasksService } from './tasks.service';
@ApiTags('tasks') @ApiBearerAuth() @Controller()
export class TasksController {
  constructor(private readonly service: TasksService) {}
  @Post('creative-versions/:id/generation-tasks') create(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() input: CreateTaskDto) { return this.service.create(user, id, input); }
  @Get('tasks') list(@CurrentUser() user: AuthenticatedUser) { return this.service.list(user); }
  @Get('tasks/:id') get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.service.get(user, id); }
  @Post('tasks/:id/cancel') cancel(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.service.cancel(user, id); }
  @Post('tasks/:id/retry') retry(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.service.retry(user, id); }
  @Post('tasks/:id/simulate') simulate(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() input: SimulateTaskDto) { return this.service.simulate(user, id, input.action); }
}
