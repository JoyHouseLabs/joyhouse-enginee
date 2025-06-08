import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsObject,
  IsBoolean,
  IsNumber,
  IsArray,
  IsEnum,
} from 'class-validator';

// 意图识别模式枚举
export enum IntentRecognitionMode {
  DISABLED = 'disabled', // 禁用意图识别
  BASIC = 'basic', // 基础意图识别（仅工具调用）
  ADVANCED = 'advanced', // 高级意图识别（工具+MCP+工作流）
  WORKFLOW_ONLY = 'workflow_only', // 仅工作流意图识别
}

// 意图识别配置接口
export interface IntentRecognitionConfig {
  mode: IntentRecognitionMode;
  confidenceThreshold: number;
  enableParameterExtraction: boolean;
  enableContextHistory: boolean;
  maxHistoryLength: number;
  fallbackToTraditional: boolean;
  enabledActionTypes: Array<'tool' | 'mcp_tool' | 'workflow'>;
  customIntentCategories?: Array<{
    id: string;
    name: string;
    description: string;
    keywords: string[];
    actionType: 'tool' | 'mcp_tool' | 'workflow';
    actionId: string;
    requiredParameters?: string[];
  }>;
}

export class LlmParamsDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  temperature?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  maxTokens?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  topP?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  frequencyPenalty?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  presencePenalty?: number;

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsOptional()
  stop?: string[];
}

export class CreateAgentDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false, type: LlmParamsDto })
  @IsObject()
  @IsOptional()
  llmParams?: LlmParamsDto;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  modelId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  providerId?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsOptional()
  @IsObject()
  intentRecognition?: IntentRecognitionConfig;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledTools?: string[]; // 启用的工具ID列表

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledMcpTools?: string[]; // 启用的MCP工具ID列表（格式：serverName:toolName）

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledWorkflows?: string[]; // 启用的工作流ID列表

  @IsOptional()
  @IsBoolean()
  enableRealTimeMonitoring?: boolean; // 是否启用实时监控

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>; // 额外的元数据
}

export class UpdateAgentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  llmParams?: {
    model: string; // 必填
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };

  @IsOptional()
  @IsString()
  modelId?: string;

  @IsOptional()
  @IsString()
  providerId?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsObject()
  intentRecognition?: IntentRecognitionConfig;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledTools?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledMcpTools?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledWorkflows?: string[];

  @IsOptional()
  @IsBoolean()
  enableRealTimeMonitoring?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// 意图识别测试DTO
export class TestIntentRecognitionDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

// 意图识别结果DTO
export class IntentRecognitionResultDto {
  recognizedIntents: Array<{
    intentId: string;
    intentName: string;
    confidence: number;
    reasoning?: string;
  }>;

  primaryIntent: {
    intentId: string;
    intentName: string;
    confidence: number;
  } | null;

  extractedParameters: Record<string, any>;
  needsClarification: boolean;

  suggestedActions: Array<{
    actionType: 'tool' | 'mcp_tool' | 'workflow' | 'clarification';
    actionId?: string;
    actionName?: string;
    description?: string;
    parameters?: Record<string, any>;
  }>;

  processingTime: number;
  modelUsed: string;
}
