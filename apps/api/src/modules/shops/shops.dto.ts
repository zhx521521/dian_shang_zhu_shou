import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength } from 'class-validator';

export class CreateShopDto {
  @ApiProperty({ example: 'tmall' })
  @IsIn(['tmall', 'jd', 'douyin', 'pdd', 'other'])
  platform!: string;

  @ApiProperty({ example: 'DEMO-TMALL' })
  @IsString()
  @MaxLength(80)
  code!: string;

  @ApiProperty({ example: '品牌旗舰店' })
  @IsString()
  @MaxLength(120)
  name!: string;
}
