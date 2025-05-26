import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsNumber, IsObject } from 'class-validator';

export class KnowledgeSearchDto {
  @ApiProperty({ description: '搜索查询' })
  @IsString()
  query: string;

  @ApiProperty({ description: '知识库ID列表', type: [String] })
  @IsArray()
  @IsString({ each: true })
  knowledgebaseIds: string[];

  @ApiPropertyOptional({ description: '搜索选项' })
  @IsOptional()
  @IsObject()
  options?: {
    limit?: number;
    threshold?: number;
    filters?: {
      codeLanguage?: string;
      fileType?: string;
      importance?: number;
    };
  };
}

export class AgentKnowledgeSearchDto {
  @ApiProperty({ description: '搜索查询' })
  @IsString()
  query: string;

  @ApiProperty({ description: '角色卡片ID' })
  @IsString()
  roleCardId: string;

  @ApiPropertyOptional({ description: '对话上下文' })
  @IsOptional()
  @IsString()
  context?: string;
}

export class ChunkQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @IsNumber()
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: '内容搜索' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: '代码语言过滤' })
  @IsOptional()
  @IsString()
  codeLanguage?: string;

  @ApiPropertyOptional({ description: '最小重要性' })
  @IsOptional()
  @IsNumber()
  minImportance?: number;
}

export class BatchUploadDto {
  @ApiProperty({ description: '知识库ID' })
  @IsString()
  knowledgebaseId: string;

  @ApiPropertyOptional({ description: '处理配置' })
  @IsOptional()
  @IsObject()
  processingConfig?: {
    chunkSize?: number;
    chunkOverlap?: number;
    enableCodeParsing?: boolean;
    enableStructureExtraction?: boolean;
  };
}

export class KnowledgeSyncDto {
  @ApiProperty({ description: '同步源类型', enum: ['url', 'git', 'api'] })
  @IsString()
  sourceType: 'url' | 'git' | 'api';

  @ApiProperty({ description: '同步源地址' })
  @IsString()
  sourceUrl: string;

  @ApiPropertyOptional({ description: '同步配置' })
  @IsOptional()
  @IsObject()
  syncConfig?: {
    branch?: string; // Git 分支
    path?: string; // 路径过滤
    fileTypes?: string[]; // 文件类型过滤
    schedule?: string; // 定时同步 cron 表达式
  };
}

export class KnowledgeQADto {
  @ApiProperty({ description: '问题' })
  @IsString()
  question: string;

  @ApiProperty({ description: '知识库ID列表', type: [String] })
  @IsArray()
  @IsString({ each: true })
  knowledgebaseIds: string[];

  @ApiPropertyOptional({ description: '上下文' })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional({ description: '回答配置' })
  @IsOptional()
  @IsObject()
  answerConfig?: {
    maxLength?: number;
    includeSource?: boolean;
    language?: string;
  };
} 