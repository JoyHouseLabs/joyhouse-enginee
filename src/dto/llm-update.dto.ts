import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class LlmProviderUpdateDto {
  @ApiProperty({ description: 'Provider ID' })
  @IsString()
  id: string;

  @ApiPropertyOptional({ description: 'Provider 名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'API Base URL' })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiPropertyOptional({ description: 'API Key' })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '图标' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: '状态' })
  @IsOptional()
  @IsBoolean()
  status?: boolean;

  @ApiPropertyOptional({ description: 'API 类型', enum: ['ollama', 'openai'] })
  @IsOptional()
  @IsString()
  apiType?: 'ollama' | 'openai';
}

export class LlmModelUpdateDto {
  @ApiProperty({ description: '模型ID' })
  @IsString()
  id: string;

  @ApiPropertyOptional({ description: '模型名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '图标' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '标签', type: [String] })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Provider ID' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ description: 'License' })
  @IsOptional()
  @IsString()
  license?: string;

  @ApiPropertyOptional({ description: '参数', type: Object })
  @IsOptional()
  params?: Record<string, any>;
}
