import { IsOptional, IsString, IsBoolean, IsNumber, IsArray, IsEnum, IsObject, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// 创建知识库DTO
export class CreateKnowledgeBaseDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsEnum(['general', 'specialized', 'agent', 'analysis', 'rag'])
  type: 'general' | 'specialized' | 'agent' | 'analysis' | 'rag';

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  includedFileIds?: string[]; // Storage IDs

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  includedDirIds?: string[]; // StorageDir IDs

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  vectorConfig?: {
    embeddingModel: string;
    dimension: number;
    chunkSize: number;
    chunkOverlap: number;
    chunkStrategy: 'fixed' | 'semantic' | 'sliding' | 'hierarchical';
    similarityThreshold: number;
    indexType: 'faiss' | 'pinecone' | 'qdrant' | 'milvus' | 'chromadb';
    indexConfig?: any;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  ragConfig?: {
    retrievalConfig: {
      topK: number;
      scoreThreshold: number;
      reranking: boolean;
      rerankingModel?: string;
      hybridSearch: boolean;
      semanticWeight: number;
      keywordWeight: number;
    };
    generationConfig: {
      model: string;
      temperature: number;
      maxTokens: number;
      systemPrompt?: string;
      contextWindow: number;
    };
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  agentConfig?: {
    systemPrompt?: string;
    functions?: Array<{
      name: string;
      description: string;
      parameters: any;
    }>;
    tools?: string[];
    conversationMemory: boolean;
    maxConversationLength: number;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

// 更新知识库DTO
export class UpdateKnowledgeBaseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  includedFileIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  includedDirIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  vectorConfig?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  ragConfig?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  agentConfig?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

// 查询知识库DTO
export class QueryKnowledgeBaseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsEnum(['general', 'specialized', 'agent', 'analysis', 'rag'], { each: true })
  types?: ('general' | 'specialized' | 'agent' | 'analysis' | 'rag')[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsEnum(['pending', 'processing', 'completed', 'failed', 'updating', 'indexing'], { each: true })
  statuses?: ('pending' | 'processing' | 'completed' | 'failed' | 'updating' | 'indexing')[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeShared?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includePublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pageSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'queryCount' | 'totalChunks';

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}

// RAG查询DTO
export class RagQueryDto {
  @ApiProperty()
  @IsString()
  query: string;

  @ApiProperty()
  @IsUUID('4')
  knowledgeBaseId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  topK?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  scoreThreshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  reranking?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hybridSearch?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filters?: string[]; // 过滤器

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeMetadata?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  stream?: boolean; // 是否流式返回
}

// 构建知识库DTO
export class BuildKnowledgeBaseDto {
  @ApiProperty()
  @IsUUID('4')
  knowledgeBaseId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  force?: boolean; // 是否强制重建

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  specificFileIds?: string[]; // 只处理特定文件

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  options?: {
    batchSize?: number;
    parallelProcessing?: boolean;
    skipExisting?: boolean;
  };
}

// 知识库统计DTO
export class KnowledgeBaseStatsDto {
  totalFiles: number;
  totalChunks: number;
  totalTokens: number;
  totalFileSize: number;
  averageChunkSize: number;
  processingProgress: number;
  queryCount: number;
  lastQueryAt?: Date;
  qualityMetrics?: {
    averageRelevanceScore: number;
    chunkCoverage: number;
    duplicateRate: number;
    languageDistribution: Record<string, number>;
    topicDistribution: Record<string, number>;
  };
} 