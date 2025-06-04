import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class LlmProviderCreateDto {
  @ApiProperty({ description: 'Provider 名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'API Base URL' })
  @IsString()
  baseUrl: string;

  @ApiProperty({ description: 'API Key', required: false })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiProperty({ description: '描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '图标', required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ description: '状态', default: true })
  @IsOptional()
  @IsBoolean()
  status?: boolean = true;

  @ApiProperty({ description: '是否公开', default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = false;

  @ApiProperty({ description: 'API 类型', enum: ['ollama', 'openai'] })
  @IsString()
  apiType: 'ollama' | 'openai';
}

export class LlmModelCreateDto {
  @ApiProperty({ description: '模型名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '图标', required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ description: '图标', required: false })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ description: '描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '标签', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Provider ID' })
  @IsString()
  provider: string;

  @ApiProperty({ description: '是否公开', default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = false;

  @ApiProperty({ description: 'License', required: false })
  @IsOptional()
  @IsString()
  license?: string;

  @ApiProperty({ description: '参数', required: false })
  @IsOptional()
  params?: Record<string, any>;
}
