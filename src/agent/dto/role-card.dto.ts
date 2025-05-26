import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsObject, IsArray } from 'class-validator';

export class CreateRoleCardDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsString()
  systemPrompt: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  userPrompt?: string;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  shortTermMemoryConfig?: {
    maxContextLength: number;
    contextRetentionTime: number;
    priorityKeywords: string[];
  };

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  longTermMemoryConfig?: {
    knowledgeCategories: string[];
    memoryRetentionDays: number;
    autoSummarize: boolean;
  };

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  llmParams?: {
    model: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stop?: string[];
  };

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  intentRecognitionConfig?: {
    enabled: boolean;
    confidence_threshold: number;
    max_intents: number;
    custom_intents: Array<{
      id: string;
      name: string;
      description: string;
      examples: string[];
      required_parameters: string[];
    }>;
  };

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  enabledTools?: string[];

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  enabledMcpTools?: string[];

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  enabledWorkflows?: string[];

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  enabledKnowledgeBases?: string[];

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  roleSpecificSettings?: {
    autoGreeting?: string;
    conversationStyle?: 'formal' | 'casual' | 'professional' | 'friendly';
    responseLength?: 'short' | 'medium' | 'long';
    expertise_level?: 'beginner' | 'intermediate' | 'expert';
    language_preference?: string;
  };

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateRoleCardDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsString()
  userPrompt?: string;

  @IsOptional()
  @IsObject()
  shortTermMemoryConfig?: {
    maxContextLength: number;
    contextRetentionTime: number;
    priorityKeywords: string[];
  };

  @IsOptional()
  @IsObject()
  longTermMemoryConfig?: {
    knowledgeCategories: string[];
    memoryRetentionDays: number;
    autoSummarize: boolean;
  };

  @IsOptional()
  @IsObject()
  llmParams?: {
    model: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stop?: string[];
  };

  @IsOptional()
  @IsObject()
  intentRecognitionConfig?: {
    enabled: boolean;
    confidence_threshold: number;
    max_intents: number;
    custom_intents: Array<{
      id: string;
      name: string;
      description: string;
      examples: string[];
      required_parameters: string[];
    }>;
  };

  @IsOptional()
  @IsArray()
  enabledTools?: string[];

  @IsOptional()
  @IsArray()
  enabledMcpTools?: string[];

  @IsOptional()
  @IsArray()
  enabledWorkflows?: string[];

  @IsOptional()
  @IsArray()
  enabledKnowledgeBases?: string[];

  @IsOptional()
  @IsObject()
  roleSpecificSettings?: {
    autoGreeting?: string;
    conversationStyle?: 'formal' | 'casual' | 'professional' | 'friendly';
    responseLength?: 'short' | 'medium' | 'long';
    expertise_level?: 'beginner' | 'intermediate' | 'expert';
    language_preference?: string;
  };

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
} 