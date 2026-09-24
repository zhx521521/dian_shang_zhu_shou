import { AuthenticatedUser } from '@eoa/contracts';
import { Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { DiagnosisService } from './diagnosis.service';

@ApiTags('diagnosis')
@ApiBearerAuth()
@Controller()
export class DiagnosisController {
  constructor(private readonly diagnosis: DiagnosisService) {}
  @Post('products/:productId/diagnoses')
  create(@CurrentUser() user: AuthenticatedUser, @Param('productId', ParseUUIDPipe) productId: string) { return this.diagnosis.create(user, productId); }
  @Get('products/:productId/diagnoses')
  list(@CurrentUser() user: AuthenticatedUser, @Param('productId', ParseUUIDPipe) productId: string) { return this.diagnosis.list(user, productId); }
  @Post('diagnoses/:id/confirm')
  confirm(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.diagnosis.confirm(user, id); }
}
