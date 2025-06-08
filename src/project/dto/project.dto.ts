import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsUUID, IsUrl, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export class ProjectDto {
  @ApiProperty({ description: '项目ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: '项目名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '项目图标', required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ description: '项目描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Twitter链接', required: false })
  @IsUrl({}, { message: 'Twitter链接格式不正确' })
  @IsOptional()
  twitter?: string;

  @ApiProperty({ description: 'Discord链接', required: false })
  @IsUrl({}, { message: 'Discord链接格式不正确' })
  @IsOptional()
  discord?: string;

  @ApiProperty({ description: '项目URL', required: false })
  @IsUrl({}, { message: '项目URL格式不正确' })
  @IsOptional()
  url?: string;

  @ApiProperty({ description: '创建者ID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: '是否推荐', required: false })
  @IsBoolean()
  @IsOptional()
  recommand?: boolean;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

export class CreateProjectDto {
  @ApiProperty({ description: '项目名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '项目图标', required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ description: '项目描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Twitter链接', required: false })
  @IsUrl({}, { message: 'Twitter链接格式不正确' })
  @IsOptional()
  twitter?: string;

  @ApiProperty({ description: 'Discord链接', required: false })
  @IsUrl({}, { message: 'Discord链接格式不正确' })
  @IsOptional()
  discord?: string;

  @ApiProperty({ description: '项目URL', required: false })
  @IsUrl({}, { message: '项目URL格式不正确' })
  @IsOptional()
  url?: string;

  @ApiProperty({ description: '是否推荐', required: false })
  @IsBoolean()
  @IsOptional()
  recommand?: boolean;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  appIds?: string[];
}

export class UpdateProjectDto {
  @ApiProperty({ description: '项目名称', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: '项目图标', required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ description: '项目描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Twitter链接', required: false })
  @IsUrl({}, { message: 'Twitter链接格式不正确' })
  @IsOptional()
  twitter?: string;

  @ApiProperty({ description: 'Discord链接', required: false })
  @IsUrl({}, { message: 'Discord链接格式不正确' })
  @IsOptional()
  discord?: string;

  @ApiProperty({ description: '项目URL', required: false })
  @IsUrl({}, { message: '项目URL格式不正确' })
  @IsOptional()
  url?: string;

  @ApiProperty({ description: '是否推荐', required: false })
  @IsBoolean()
  @IsOptional()
  recommand?: boolean;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  appIds?: string[];
}

export class ProjectQueryDto {
  @ApiProperty({ description: '页码', required: false, default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number;

  @ApiProperty({ description: '每页数量', required: false, default: 10 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  pageSize?: number;

  @ApiProperty({ description: '项目名称', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: '用户ID', required: false })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiProperty({ description: '是否推荐', required: false })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return value;
  })
  recommand?: boolean;
}
