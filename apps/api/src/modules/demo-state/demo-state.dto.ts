import { IsObject, IsUUID } from 'class-validator';

export class DemoStateQueryDto {
  @IsUUID() shopId!: string;
}

export class SaveDemoStateDto {
  @IsUUID() shopId!: string;
  @IsObject() state!: Record<string, unknown>;
}
