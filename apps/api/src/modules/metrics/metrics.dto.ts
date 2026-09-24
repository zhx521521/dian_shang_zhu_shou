import { Type } from 'class-transformer';
import { IsDate, IsInt, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
export class CreateMetricDto {
  @Type(() => Date) @IsDate() metricDate!: Date;
  @IsOptional() @IsUUID() skuId?: string;
  @IsOptional() @IsUUID() experimentId?: string;
  @IsInt() @Min(0) impressions!: number;
  @IsInt() @Min(0) clicks!: number;
  @IsInt() @Min(0) visitors!: number;
  @IsInt() @Min(0) bouncedVisitors!: number;
  @IsInt() @Min(0) paidOrders!: number;
  @IsInt() @Min(0) unitsSold!: number;
  @IsNumber() @Min(0) gmv!: number;
  @IsNumber() @Min(0) adSpend!: number;
}
