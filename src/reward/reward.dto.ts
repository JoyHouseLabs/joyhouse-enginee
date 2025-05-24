import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, IsObject } from 'class-validator';
import { RewardType } from './reward.entity';

export class RewardDto {
  @ApiProperty({ description: '奖励ID' })
  id: string;

  @ApiProperty({ description: '奖励名称' })
  name: string;

  @ApiProperty({ description: '奖励图标', required: false })
  icon?: string;

  @ApiProperty({ description: '奖励描述', required: false })
  description?: string;

  @ApiProperty({ description: '奖励类型', enum: RewardType })
  type: RewardType;

  @ApiProperty({ description: '奖励数量' })
  amount: number;

  @ApiProperty({ description: '是否启用' })
  isActive: boolean;

  @ApiProperty({ description: '奖励参数', required: false })
  params?: Record<string, any>;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

export class CreateRewardDto {
  @ApiProperty({ description: '奖励名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '奖励图标', required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ description: '奖励描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '奖励类型', enum: RewardType })
  @IsEnum(RewardType)
  type: RewardType;

  @ApiProperty({ description: '奖励数量' })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: '是否启用', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: '奖励参数', required: false })
  @IsObject()
  @IsOptional()
  params?: Record<string, any>;
}

export class UpdateRewardDto extends CreateRewardDto {
  @ApiProperty({ description: '奖励ID' })
  @IsString()
  id: string;
}

export class RewardQueryDto {
  @ApiProperty({ description: '页码', default: '1' })
  @IsString()
  @IsOptional()
  page?: string = '1';

  @ApiProperty({ description: '每页数量', default: '20' })
  @IsString()
  @IsOptional()
  limit?: string = '20';

  @ApiProperty({ description: '奖励名称', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: '奖励类型', required: false, enum: RewardType })
  @IsEnum(RewardType)
  @IsOptional()
  type?: RewardType;

  @ApiProperty({ description: '是否启用', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class RewardListResponseDto {
  @ApiProperty({ description: '奖励列表', type: [RewardDto] })
  list: RewardDto[];

  @ApiProperty({ description: '总数' })
  total: number;

  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  limit: number;
} 