import { IsOptional, IsString, MinLength } from 'class-validator';
export class ReviewAssetDto {
  @IsOptional() @IsString() comment?: string;
}
export class RejectAssetDto {
  @IsString() @MinLength(2) comment!: string;
}
