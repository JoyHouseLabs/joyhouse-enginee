import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsBoolean,
  IsUrl,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ToolType, HttpMethod } from '../entities/tool.entity';

export class FewShotExampleDto {
  @ApiProperty({ description: '输入示例' })
  @IsString()
  input: string;

  @ApiProperty({ description: '输出示例' })
  output: any;

  @ApiProperty({ description: '示例描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateToolDto {
  @ApiProperty({ description: '工具名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '工具图标', required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ description: '工具描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: '工具调用提示词，用于帮助大模型理解何时使用此工具',
    required: false,
  })
  @IsString()
  @IsOptional()
  prompt?: string;

  @ApiProperty({
    description: 'Few-shot 示例，用于帮助大模型理解工具的使用方式',
    type: [FewShotExampleDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FewShotExampleDto)
  @IsOptional()
  fewShot?: FewShotExampleDto[];

  @ApiProperty({ description: '工具类型', enum: ToolType })
  @IsEnum(ToolType)
  type: ToolType;

  @ApiProperty({ description: 'HTTP 请求头', required: false })
  @IsObject()
  @IsOptional()
  headers?: Record<string, string>;

  @ApiProperty({ description: 'HTTP 方法', enum: HttpMethod, required: false })
  @IsEnum(HttpMethod)
  @IsOptional()
  method?: HttpMethod;

  @ApiProperty({ description: '请求 URL' })
  @IsUrl()
  url: string;

  @ApiProperty({ description: '请求参数', required: false })
  @IsObject()
  @IsOptional()
  requestParams?: {
    query?: Record<string, string>;
    body?: Record<string, any>;
    path?: Record<string, string>;
  };

  @ApiProperty({ description: '响应模式', required: false })
  @IsObject()
  @IsOptional()
  responseSchema?: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };

  @ApiProperty({ description: '认证信息', required: false })
  @IsObject()
  @IsOptional()
  auth?: {
    type: 'none' | 'basic' | 'bearer' | 'apiKey';
    username?: string;
    password?: string;
    token?: string;
    key?: string;
    value?: string;
    in?: 'header' | 'query' | 'cookie';
  };

  @ApiProperty({ description: '是否公开', default: false })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}

export class UpdateToolDto extends CreateToolDto {}
