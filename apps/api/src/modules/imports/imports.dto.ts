import { IsArray, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
export class CreateImportDto {
  @IsIn(['product', 'sku_inventory', 'competitor', 'metric']) type!: 'product' | 'sku_inventory' | 'competitor' | 'metric';
  @IsString() fileName!: string;
  @IsOptional() @IsString() storageKey?: string;
  @IsOptional() @IsString() templateVersion?: string;
  @IsOptional() @IsUUID() shopId?: string;
  @IsOptional() @IsArray() headers?: string[];
  @IsOptional() @IsArray() rows?: string[][];
}
