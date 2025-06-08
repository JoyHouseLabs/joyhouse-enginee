import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn, Index } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Knowledgebase } from '../knowledgebase.entity';
import { KnowledgeChunk } from './knowledge-chunk.entity';

// Agent对话会话
@Entity('agent_conversations')
@Index(['userId'])
@Index(['knowledgebaseId'])
export class AgentConversation {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ type: 'uuid' })
  userId: string;

  @ApiProperty()
  @Column({ type: 'uuid' })
  knowledgebaseId: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  description?: string;

  // 对话类型
  @ApiProperty()
  @Column({ 
    type: 'enum', 
    enum: ['chat', 'analysis', 'summarization', 'extraction', 'evolution'], 
    default: 'chat' 
  })
  type: 'chat' | 'analysis' | 'summarization' | 'extraction' | 'evolution';

  // 对话状态
  @ApiProperty()
  @Column({ 
    type: 'enum', 
    enum: ['active', 'archived', 'deleted'], 
    default: 'active' 
  })
  status: 'active' | 'archived' | 'deleted';

  // 对话配置
  @ApiPropertyOptional()
  @Column('jsonb', { nullable: true })
  config?: {
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt?: string;
    retrievalConfig?: {
      topK: number;
      scoreThreshold: number;
      includeMetadata: boolean;
    };
    memoryConfig?: {
      maxMessages: number;
      compressionThreshold: number;
      retainImportant: boolean;
    };
  };

  // 对话上下文和记忆
  @ApiPropertyOptional()
  @Column('jsonb', { nullable: true })
  context?: {
    topics: string[]; // 讨论的主题
    entities: string[]; // 提到的实体
    keyInsights: string[]; // 关键洞察
    actionItems: string[]; // 行动项
    references: string[]; // 引用的文档/块ID
  };

  // 统计信息
  @ApiProperty()
  @Column({ type: 'int', default: 0 })
  messageCount: number;

  @ApiProperty()
  @Column({ type: 'int', default: 0 })
  generatedInsights: number; // 生成的洞察数量

  @ApiProperty()
  @Column({ type: 'int', default: 0 })
  createdNotes: number; // 创建的笔记数量

  @ApiPropertyOptional()
  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt?: Date;

  // 质量评分
  @ApiPropertyOptional()
  @Column({ type: 'float', nullable: true })
  satisfactionScore?: number; // 用户满意度

  @ApiPropertyOptional()
  @Column({ type: 'float', nullable: true })
  relevanceScore?: number; // 内容相关性

  // 关联关系
  @ManyToOne(() => Knowledgebase, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'knowledgebaseId' })
  knowledgebase: Knowledgebase;

  @OneToMany(() => AgentMessage, message => message.conversation)
  messages: AgentMessage[];

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}

// Agent消息实体
@Entity('agent_messages')
@Index(['conversationId'])
@Index(['createdAt'])
export class AgentMessage {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ type: 'uuid' })
  conversationId: string;

  // 消息角色
  @ApiProperty()
  @Column({ 
    type: 'enum', 
    enum: ['user', 'assistant', 'system', 'function'] 
  })
  role: 'user' | 'assistant' | 'system' | 'function';

  @ApiProperty()
  @Column({ type: 'text' })
  content: string;

  // 消息元数据
  @ApiPropertyOptional()
  @Column('jsonb', { nullable: true })
  metadata?: {
    // 检索上下文
    retrievedChunks?: Array<{
      chunkId: string;
      score: number;
      content: string;
      source: string;
    }>;
    
    // 生成参数
    modelUsed?: string;
    temperature?: number;
    tokensUsed?: number;
    
    // 功能调用
    functionCalls?: Array<{
      name: string;
      arguments: any;
      result: any;
    }>;
    
    // 知识演进
    knowledgeEvolution?: {
      newInsights: string[];
      updatedConcepts: string[];
      createdLinks: string[];
      suggestedActions: string[];
    };
    
    // 质量指标
    confidence?: number;
    relevance?: number;
    novelty?: number;
  };

  // 引用的知识块
  @ApiPropertyOptional()
  @Column({ type: 'simple-array', nullable: true })
  referencedChunks?: string[]; // KnowledgeChunk IDs

  // 生成的内容
  @ApiPropertyOptional()
  @Column('jsonb', { nullable: true })
  generatedContent?: {
    summaries?: string[];
    insights?: string[];
    questions?: string[];
    actionItems?: string[];
    newNotes?: Array<{
      title: string;
      content: string;
      tags: string[];
    }>;
  };

  // 用户反馈
  @ApiPropertyOptional()
  @Column({ type: 'float', nullable: true })
  userRating?: number; // 1-5分

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  userFeedback?: string;

  @ApiPropertyOptional()
  @Column({ type: 'boolean', default: false })
  markedAsImportant?: boolean;

  // 关联关系
  @ManyToOne(() => AgentConversation, conversation => conversation.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: AgentConversation;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}

// 知识演进记录
@Entity('knowledge_evolutions')
@Index(['userId'])
@Index(['sourceType', 'sourceId'])
export class KnowledgeEvolution {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ type: 'uuid' })
  userId: string;

  // 演进来源
  @ApiProperty()
  @Column({ type: 'varchar', length: 64 })
  sourceType: 'conversation' | 'workflow' | 'manual' | 'import';

  @ApiProperty()
  @Column({ type: 'uuid' })
  sourceId: string; // 对话ID、工作流ID等

  // 演进类型
  @ApiProperty()
  @Column({ 
    type: 'enum', 
    enum: ['insight', 'summary', 'connection', 'refinement', 'expansion'] 
  })
  type: 'insight' | 'summary' | 'connection' | 'refinement' | 'expansion';

  @ApiProperty()
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiProperty()
  @Column({ type: 'text' })
  description: string;

  // 影响的知识
  @ApiPropertyOptional()
  @Column('jsonb', { nullable: true })
  impact?: {
    affectedChunks: string[]; // 影响的知识块ID
    newConnections: Array<{
      source: string;
      target: string;
      type: string;
      confidence: number;
    }>;
    updatedConcepts: Array<{
      conceptId: string;
      changes: string[];
    }>;
    qualityImprovements: {
      relevanceImprovement: number;
      coherenceImprovement: number;
      completenessImprovement: number;
    };
  };

  // 应用状态
  @ApiProperty()
  @Column({ 
    type: 'enum', 
    enum: ['pending', 'applied', 'rejected', 'partial'], 
    default: 'pending' 
  })
  status: 'pending' | 'applied' | 'rejected' | 'partial';

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  appliedChanges?: string;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
} 