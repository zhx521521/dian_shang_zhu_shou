import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsObject, IsString, IsUrl, Min } from 'class-validator';

export class CreateCompetitorDto {
  @IsString() name!: string;
  @IsString() platform!: string;
  @IsUrl({ require_tld: false }) sourceUrl!: string;
  @IsNumber() @Min(0) price!: number;
  @IsObject() parameters!: Record<string, unknown>;
  @IsObject() sellingPoints!: Record<string, unknown>;
  @Type(() => Date) @IsDate() collectedAt!: Date;
}
