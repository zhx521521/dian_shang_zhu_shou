import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsUUID } from 'class-validator';
export class CreateReportDto { @IsOptional() @IsUUID() experimentId?: string; @Type(() => Date) @IsDate() periodStart!: Date; @Type(() => Date) @IsDate() periodEnd!: Date; }
