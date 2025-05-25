import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class LlmProviderUpdateDto {
  @ApiProperty({ description: 'Provider ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Provider 名称', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Provider 基础URL', required: false })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiProperty({ description: 'Provider API Key', required: false })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiProperty({ description: 'Provider 描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Provider 图标', required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ description: 'Provider 状态', required: false })
  @IsOptional()
  @IsBoolean()
  status?: boolean;

  @ApiProperty({ description: '是否公开', required: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiProperty({ description: 'API 类型', enum: ['ollama', 'openai'], required: false })
  @IsOptional()
  @IsString()
  apiType?: 'ollama' | 'openai';
}

export class LlmModelUpdateDto {
  @ApiProperty({ description: '模型 ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: '模型名称', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '模型标签', required: false })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ description: '模型图标', required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ description: '模型描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '模型标签', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Provider ID', required: false })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({ description: '是否公开', required: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiProperty({ description: '模型许可证', required: false })
  @IsOptional()
  @IsString()
  license?: string;

  @ApiProperty({ description: '模型参数', required: false })
  @IsOptional()
  params?: Record<string, any>;
}
