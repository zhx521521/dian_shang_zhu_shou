import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';
export class CreateExperimentDto { @IsObject() content!: Record<string, unknown>; }
export class RejectExperimentDto { @IsString() @MinLength(2) comment!: string; }
export class ApproveExperimentDto { @IsOptional() @IsString() comment?: string; }
