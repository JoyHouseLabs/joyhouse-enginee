import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, OneToMany, JoinTable, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Storage } from '../storage/storage.entity';
import { StorageDir } from '../storage/storage-dir.entity';
import { KnowledgeChunk } from './entities/knowledge-chunk.entity';

@Entity('knowledge_bases')
@Index(['userId'])
@Index(['status'])
@Index(['type'])
export class Knowledgebase {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ type: 'uuid' })
  userId: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 255, nullable: true })
  icon?: string;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  description?: string;

  // 知识库类型 - 新增
  @ApiProperty()
  @Column({ 
    type: 'enum', 
    enum: ['general', 'specialized', 'agent', 'analysis', 'rag'], 
    default: 'general' 
  })
  type: 'general' | 'specialized' | 'agent' | 'analysis' | 'rag';

  // 与Storage模块集成 - 包含的文件
  @ApiPropertyOptional()
  @ManyToMany(() => Storage, storage => storage.knowledgeBases)
  @JoinTable({
    name: 'knowledge_base_files',
    joinColumn: { name: 'knowledgeBaseId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'storageId', referencedColumnName: 'id' }
  })
  includedFiles: Storage[];

  // 与Storage模块集成 - 包含的目录
  @ApiPropertyOptional()
  @ManyToMany(() => StorageDir)
  @JoinTable({
    name: 'knowledge_base_dirs',
    joinColumn: { name: 'knowledgeBaseId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'storageDirId', referencedColumnName: 'id' }
  })
  includedDirs: StorageDir[];

  // 向量化配置 - 增强
  @ApiPropertyOptional()
  @Column({ type: 'json', nullable: true })
  vectorConfig?: {
    embeddingModel: string; // embedding模型
    dimension: number; // 向量维度
    chunkSize: number; // 分块大小
    chunkOverlap: number; // 重叠大小
    chunkStrategy: 'fixed' | 'semantic' | 'sliding' | 'hierarchical'; // 分块策略
    similarityThreshold: number; // 相似度阈值
    indexType: 'faiss' | 'pinecone' | 'qdrant' | 'milvus' | 'chromadb'; // 向量数据库类型
    indexConfig?: any; // 索引特定配置
  };

  // RAG配置 - 新增
  @ApiPropertyOptional()
  @Column({ type: 'json', nullable: true })
  ragConfig?: {
    retrievalConfig: {
      topK: number; // 检索数量
      scoreThreshold: number; // 分数阈值
      reranking: boolean; // 是否重排序
      rerankingModel?: string; // 重排序模型
      hybridSearch: boolean; // 是否混合搜索
      semanticWeight: number; // 语义搜索权重
      keywordWeight: number; // 关键词搜索权重
    };
    generationConfig: {
      model: string; // 生成模型
      temperature: number; // 温度
      maxTokens: number; // 最大token
      systemPrompt?: string; // 系统提示词
      contextWindow: number; // 上下文窗口
    };
  };

  // Agent配置 - 增强
  @ApiPropertyOptional()
  @Column({ type: 'json', nullable: true })
  agentConfig?: {
    systemPrompt?: string;
    functions?: Array<{
      name: string;
      description: string;
      parameters: any;
    }>;
    tools?: string[]; // 可用工具列表
    conversationMemory: boolean; // 是否保存对话记忆
    maxConversationLength: number; // 最大对话长度
  };

  // 处理状态
  @ApiProperty()
  @Column({ 
    type: 'enum', 
    enum: ['pending', 'processing', 'completed', 'failed', 'updating', 'indexing'], 
    default: 'pending' 
  })
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'updating' | 'indexing';

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  statusMessage?: string;

  @ApiPropertyOptional()
  @Column({ type: 'float', nullable: true, default: 0 })
  processingProgress?: number; // 处理进度 0-100

  // 统计信息 - 增强
  @ApiProperty()
  @Column({ type: 'int', default: 0 })
  totalFiles: number;

  @ApiProperty()
  @Column({ type: 'int', default: 0 })
  totalChunks: number;

  @ApiProperty()
  @Column({ type: 'bigint', default: 0 })
  totalTokens: number;

  @ApiPropertyOptional()
  @Column({ type: 'float', nullable: true })
  averageChunkSize?: number;

  @ApiPropertyOptional()
  @Column({ type: 'bigint', default: 0 })
  totalFileSize: number; // 总文件大小

  // 使用统计
  @ApiProperty()
  @Column({ type: 'int', default: 0 })
  queryCount: number;

  @ApiPropertyOptional()
  @Column({ type: 'timestamp', nullable: true })
  lastQueryAt?: Date;

  @ApiPropertyOptional()
  @Column({ type: 'timestamp', nullable: true })
  lastUpdateAt?: Date;

  @ApiPropertyOptional()
  @Column({ type: 'timestamp', nullable: true })
  lastIndexAt?: Date; // 最后索引时间

  // 质量评估 - 新增
  @ApiPropertyOptional()
  @Column({ type: 'json', nullable: true })
  qualityMetrics?: {
    averageRelevanceScore: number;
    chunkCoverage: number; // 内容覆盖率
    duplicateRate: number; // 重复率
    languageDistribution: Record<string, number>; // 语言分布
    topicDistribution: Record<string, number>; // 主题分布
  };

  // 权限和共享 - 保持原有逻辑但增强
  @ApiPropertyOptional()
  @Column({ type: 'simple-array', nullable: true })
  sharedWith?: string[];

  @ApiPropertyOptional()
  @Column({ type: 'simple-json', nullable: true })
  sharePermissions?: Array<{
    userId: string;
    permission: 'read' | 'query' | 'manage' | 'admin';
    expiresAt?: Date;
  }>;

  @ApiProperty()
  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 32, default: 'private' })
  publishStatus?: 'private' | 'shared' | 'public' | 'marketplace';

  // 关联的知识块
  @OneToMany(() => KnowledgeChunk, chunk => chunk.knowledgebase)
  chunks: KnowledgeChunk[];

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
