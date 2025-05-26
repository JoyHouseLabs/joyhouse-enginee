import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Knowledgebase } from '../knowledgebase.entity';
import { Knowledgefile } from '../knowledgefile.entity';

@Entity('knowledge_chunk')
@Index(['knowledgebaseId', 'relevanceScore'])
@Index(['fileId'])
export class KnowledgeChunk {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column()
  knowledgebaseId: string;

  @ApiProperty()
  @Column()
  fileId: string;

  @ApiProperty()
  @Column({ type: 'text' })
  content: string;

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 500, nullable: true })
  title?: string;

  @ApiPropertyOptional()
  @Column({ type: 'json', nullable: true })
  metadata?: {
    pageNumber?: number;
    section?: string;
    codeLanguage?: string;
    functionName?: string;
    className?: string;
    importance?: number;
    startLine?: number;
    endLine?: number;
    filePath?: string;
  };

  @ApiPropertyOptional()
  @Column({ type: 'simple-array', nullable: true })
  embedding?: number[];

  @ApiPropertyOptional()
  @Column({ type: 'json', nullable: true })
  keywords?: string[];

  @ApiProperty()
  @Column({ default: 0 })
  accessCount: number;

  @ApiProperty()
  @Column({ type: 'float', default: 0 })
  relevanceScore: number;

  @ApiPropertyOptional()
  @Column({ type: 'json', nullable: true })
  semanticTags?: string[];

  @ManyToOne(() => Knowledgebase, kb => kb.chunks, { onDelete: 'CASCADE' })
  knowledgebase: Knowledgebase;

  @ManyToOne(() => Knowledgefile, file => file.chunks, { onDelete: 'CASCADE' })
  file: Knowledgefile;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
} 