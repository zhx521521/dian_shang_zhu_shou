import { IsIn, IsObject, IsString, IsUUID } from 'class-validator';
export class CreateTaskDto {
  @IsUUID() productId!: string;
  @IsIn(['image', 'video']) type!: 'image' | 'video';
  @IsObject() payload!: Record<string, unknown>;
  @IsString() idempotencyKey!: string;
}

export class SimulateTaskDto {
  @IsIn(['succeed', 'fail', 'timeout', 'cancel']) action!: 'succeed' | 'fail' | 'timeout' | 'cancel';
}
