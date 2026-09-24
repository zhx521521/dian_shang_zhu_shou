import { AuthenticatedUser } from '@eoa/contracts';
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { CreateProductDto, ProductQueryDto } from './products.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}
  @Get() list(@CurrentUser() user: AuthenticatedUser, @Query() query: ProductQueryDto) {
    return this.products.list(user, query);
  }
  @Post() create(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateProductDto) {
    return this.products.create(user, input);
  }
  @Get(':id') get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.products.get(user, id);
  }
  @Post(':id/archive') archive(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.products.archive(user, id);
  }
}
