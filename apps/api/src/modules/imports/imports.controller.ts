import { AuthenticatedUser } from '@eoa/contracts';
import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { DatabaseService } from '../../database.service';
import { CreateImportDto } from './imports.dto';
import { DemoModeService } from '../../demo-mode.service';
import { DemoStateService } from '../demo-state/demo-state.service';
import { BadRequestException, ForbiddenException, Get, Query } from '@nestjs/common';
import { DemoStateQueryDto } from '../demo-state/demo-state.dto';
@ApiTags('imports') @ApiBearerAuth() @Controller('imports')
export class ImportsController {
  constructor(private readonly db: DatabaseService, private readonly demo: DemoModeService, private readonly demoState: DemoStateService) {}
  @Get() list(@CurrentUser() user: AuthenticatedUser, @Query() query: DemoStateQueryDto) {
    if (!user.shopIds.includes(query.shopId)) throw new ForbiddenException('无权查看该店铺的导入记录');
    if (this.demo.enabled && !this.db.available) return this.demoState.list(query.shopId, 'imports');
    return this.db.client.importJob.findMany({ where: { createdBy: user.id }, orderBy: { createdAt: 'desc' } });
  }
  @Post() create(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateImportDto) {
    if (this.demo.enabled && !this.db.available) {
      if (!input.shopId || !user.shopIds.includes(input.shopId)) throw new BadRequestException('请指定有权限的店铺');
      if (!input.headers?.length || !input.rows?.length) throw new BadRequestException('CSV 快照缺少表头或数据行');
      return this.demoState.create(input.shopId, 'imports', { id: crypto.randomUUID(), shopId: input.shopId, type: input.type, fileName: input.fileName, status: 'imported', rows: input.rows.length, headers: input.headers, sampleRows: input.rows, result: `已保存 ${input.rows.length} 行 CSV 快照`, createdBy: user.id, createdAt: new Date().toISOString() });
    }
    if (!input.storageKey || !input.templateVersion) throw new BadRequestException('导入任务缺少文件存储位置或模板版本');
    const { headers: _headers, rows: _rows, shopId: _shopId, ...data } = input;
    return this.db.client.importJob.create({ data: { ...data, storageKey: input.storageKey!, templateVersion: input.templateVersion!, createdBy: user.id, updatedBy: user.id } });
  }
}
