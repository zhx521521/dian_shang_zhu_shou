import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'operator' })
  @IsString()
  username!: string;

  @ApiProperty({ example: 'Demo@123456' })
  @IsString()
  @MinLength(8)
  password!: string;
}
