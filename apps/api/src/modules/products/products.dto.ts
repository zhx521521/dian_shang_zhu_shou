import { ProductStatus } from '@eoa/contracts';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsInt, IsNumber, IsObject, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSkuDto {
  @IsString() code!: string;
  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject() attributes!: Record<string, string>;
  @IsNumber() @Min(0) salePrice!: number;
  @IsInt() @Min(0) availableStock!: number;
  @IsInt() @Min(0) warningStock!: number;
}

export class CreateProductDto {
  @IsUUID() shopId!: string;
  @IsString() name!: string;
  @IsString() category!: string;
  @IsString() brand!: string;
  @IsUUID() ownerId!: string;
  @IsOptional() @IsString() mainImageUrl?: string;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateSkuDto)
  skus!: CreateSkuDto[];
}

export class ProductQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() shopId?: string;
  @ApiPropertyOptional({ enum: ProductStatus }) @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() keyword?: string;
}
