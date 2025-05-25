import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class AppDto {
  @ApiProperty({ description: '应用ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: '应用名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '应用图标', required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ description: '应用描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '应用URL', required: false })
  @IsString()
  @IsOptional()
  url?: string;

  @ApiProperty({ description: '应用路由路径', required: false })
  @IsString()
  @IsOptional()
  routerPath?: string;

  @ApiProperty({ description: '人民币价格' })
  @IsNumber()
  priceCny: number;

  @ApiProperty({ description: '美元价格' })
  @IsNumber()
  priceUsd: number;

  @ApiProperty({ description: '创建者ID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

export class CreateAppDto {
  @ApiProperty({ description: '应用名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '应用图标', required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ description: '应用描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '应用URL', required: false })
  @IsString()
  @IsOptional()
  url?: string;

  @ApiProperty({ description: '应用路由路径', required: false })
  @IsString()
  @IsOptional()
  routerPath?: string;

  @ApiProperty({ description: '人民币价格' })
  @IsNumber()
  priceCny: number;

  @ApiProperty({ description: '美元价格' })
  @IsNumber()
  priceUsd: number;
}

export class UpdateAppDto extends CreateAppDto {
  @ApiProperty({ description: '应用ID' })
  @IsUUID()
  id: string;
}

export class AppQueryDto {
  @ApiProperty({ description: '页码', required: false })
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiProperty({ description: '每页数量', required: false })
  @IsNumber()
  @IsOptional()
  pageSize?: number;

  @ApiProperty({ description: '应用名称', required: false })
  @IsString()
  @IsOptional()
  name?: string;
} 