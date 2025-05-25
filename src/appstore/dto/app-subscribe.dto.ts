import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsEnum, IsDate, IsOptional } from 'class-validator';
import { SubscribeStatus } from '../app-subscribe.entity';

export class AppSubscribeDto {
  @ApiProperty({ description: '订阅ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: '用户ID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: '应用ID' })
  @IsUUID()
  appId: string;

  @ApiProperty({ description: '过期时间' })
  @IsDate()
  expireAt: Date;

  @ApiProperty({ description: '订阅状态', enum: SubscribeStatus })
  @IsEnum(SubscribeStatus)
  status: SubscribeStatus;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

export class CreateAppSubscribeDto {
  @ApiProperty({ description: '应用ID' })
  @IsUUID()
  appId: string;

  @ApiProperty({ description: '过期时间' })
  @IsDate()
  expireAt: Date;
}

export class UpdateAppSubscribeDto {
  @ApiProperty({ description: '订阅ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: '订阅状态', enum: SubscribeStatus })
  @IsEnum(SubscribeStatus)
  status: SubscribeStatus;
}

export class AppSubscribeQueryDto {
  @ApiProperty({ description: '页码', required: false })
  @IsString()
  @IsOptional()
  page?: string;

  @ApiProperty({ description: '每页数量', required: false })
  @IsString()
  @IsOptional()
  pageSize?: string;

  @ApiProperty({ description: '用户ID', required: false })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiProperty({ description: '应用ID', required: false })
  @IsUUID()
  @IsOptional()
  appId?: string;

  @ApiProperty({ description: '订阅状态', enum: SubscribeStatus, required: false })
  @IsEnum(SubscribeStatus)
  @IsOptional()
  status?: SubscribeStatus;
} 