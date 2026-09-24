import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';
export class UpsertServiceConfigDto {
  @IsString() serviceType!: string;
  @IsOptional() @IsUrl({ require_tld: false }) baseUrl?: string;
  @IsOptional() @IsString() modelName?: string;
  @IsOptional() @IsString() apiKey?: string;
  @IsInt() @Min(1) @Max(3600) timeoutSeconds!: number;
  @IsInt() @Min(0) @Max(5) maxRetries!: number;
  @IsInt() @Min(1) @Max(100) concurrency!: number;
  @IsBoolean() enabled!: boolean;
}
