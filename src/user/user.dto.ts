import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UserDto {
  @ApiProperty({ required: false, description: '钱包地址' })
  @IsOptional()
  @IsString()
  walletAddress?: string;

  @ApiProperty({ required: false, description: '主链类型（sol/evm）' })
  @IsOptional()
  @IsString()
  walletMainchain?: string;
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  username: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiProperty()
  @IsOptional()
  createdAt: Date;

  @ApiProperty()
  @IsOptional()
  updatedAt: Date;
}
