import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Knowledgebase } from '../knowledgebase.entity';
import { Storage } from '../../storage/storage.entity';
import { FileContent } from '../../storage/file-content.entity';
import { Block } from '../../storage/block.entity';

@Entity('knowledge_chunks')
@Index(['knowledgebaseId', 'relevanceScore'])
@Index(['storageId'])
@Index(['embeddingVector']) // 向量索引
@Index(['chunkType'])
export class KnowledgeChunk {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ type: 'uuid' })
  knowledgebaseId: string;

  // 直接关联Storage而不是Knowledgefile
  @ApiProperty()
  @Column({ type: 'uuid' })
  storageId: string;

  // 可选关联FileContent（用于精确定位内容来源）
  @ApiPropertyOptional()
  @Column({ type: 'uuid', nullable: true })
  fileContentId?: string;

  // 可选关联Block（用于Notion风格页面的块级内容）
  @ApiPropertyOptional()
  @Column({ type: 'uuid', nullable: true })
  blockId?: string;

  // 块类型 - 增强
  @ApiProperty()
  @Column({ 
    type: 'enum', 
    enum: ['text', 'code', 'table', 'image', 'metadata', 'heading', 'list', 'quote', 'equation'], 
    default: 'text' 
  })
  chunkType: 'text' | 'code' | 'table' | 'image' | 'metadata' | 'heading' | 'list' | 'quote' | 'equation';

  @ApiProperty()
  @Column({ type: 'text' })
  content: string;

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 500, nullable: true })
  title?: string;

  // 增强的元数据
  @ApiPropertyOptional()
  @Column({ type: 'json', nullable: true })
  metadata?: {
    // 位置信息
    pageNumber?: number;
    section?: string;
    startLine?: number;
    endLine?: number;
    position?: { start: number; end: number }; // 字符位置
    
    // 内容结构
    level?: number; // 标题级别或层次
    parent?: string; // 父级chunk ID
    children?: string[]; // 子级chunk IDs
    
    // 代码相关
    codeLanguage?: string;
    functionName?: string;
    className?: string;
    
    // 表格相关
    tableHeaders?: string[];
    rowCount?: number;
    columnCount?: number;
    
    // 图像相关
    imageCaption?: string;
    imageType?: string;
    ocrText?: string; // OCR提取的文本
    
    // 语义信息
    importance?: number; // 重要性评分 1-10
    complexity?: number; // 复杂度评分 1-10
    sentiment?: 'positive' | 'negative' | 'neutral';
    
    // 来源追踪
    extractionMethod?: 'direct' | 'ocr' | 'parsing' | 'semantic';
    confidence?: number; // 提取置信度
    
    // 其他自定义属性
    [key: string]: any;
  };

  // 向量embedding - 增强
  @ApiPropertyOptional()
  @Column({ type: 'simple-array', nullable: true })
  embeddingVector?: number[]; // 主要向量

  @ApiPropertyOptional()
  @Column({ type: 'json', nullable: true })
  multiModalEmbeddings?: {
    text?: number[];
    image?: number[];
    code?: number[];
    semantic?: number[];
  };

  // 关键词和标签 - 增强
  @ApiPropertyOptional()
  @Column({ type: 'simple-array', nullable: true })
  keywords?: string[];

  @ApiPropertyOptional()
  @Column({ type: 'simple-array', nullable: true })
  semanticTags?: string[];

  @ApiPropertyOptional()
  @Column({ type: 'simple-array', nullable: true })
  entities?: string[]; // 命名实体

  @ApiPropertyOptional()
  @Column({ type: 'simple-array', nullable: true })
  topics?: string[]; // 主题标签

  // 质量和相关性评分
  @ApiProperty()
  @Column({ type: 'float', default: 0 })
  relevanceScore: number;

  @ApiPropertyOptional()
  @Column({ type: 'float', nullable: true })
  qualityScore?: number; // 内容质量评分

  @ApiPropertyOptional()
  @Column({ type: 'float', nullable: true })
  noveltyScore?: number; // 新颖性评分

  @ApiPropertyOptional()
  @Column({ type: 'float', nullable: true })
  diversityScore?: number; // 多样性评分

  // 使用统计
  @ApiProperty()
  @Column({ default: 0 })
  accessCount: number;

  @ApiPropertyOptional()
  @Column({ default: 0 })
  queryMatchCount: number; // 查询匹配次数

  @ApiPropertyOptional()
  @Column({ type: 'timestamp', nullable: true })
  lastAccessedAt?: Date;

  // 处理状态
  @ApiPropertyOptional()
  @Column({ 
    type: 'enum', 
    enum: ['pending', 'processed', 'indexed', 'failed'], 
    default: 'pending' 
  })
  processingStatus?: 'pending' | 'processed' | 'indexed' | 'failed';

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  processingNotes?: string;

  // 关联关系
  @ManyToOne(() => Knowledgebase, kb => kb.chunks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'knowledgebaseId' })
  knowledgebase: Knowledgebase;

  @ManyToOne(() => Storage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storageId' })
  storage: Storage;

  @ManyToOne(() => FileContent, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fileContentId' })
  fileContent?: FileContent;

  @ManyToOne(() => Block, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'blockId' })
  block?: Block;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
} 