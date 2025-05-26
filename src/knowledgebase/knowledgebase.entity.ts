import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity()
export class Knowledgebase {
  @ApiProperty() @PrimaryColumn({ type: 'varchar', length: 26 }) id: string;
  @ApiProperty() @Column({ type: 'varchar', length: 26 }) userId: string;
  @ApiProperty() @Column({ type: 'varchar', length: 255 }) name: string;
  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 255, nullable: true })
  icon?: string;
  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 1024, nullable: true })
  description?: string;
  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 1024, nullable: true })
  typicalQuery?: string;
  @ApiPropertyOptional()
  @Column({ type: 'boolean', default: false })
  enableLlmParser?: boolean;
  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  prompt?: string;
  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  embedding?: string;
  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 128, nullable: true })
  embeddingModel?: string;
  @ApiPropertyOptional()
  @Column({ type: 'json', nullable: true })
  processingConfig?: any;
  @ApiProperty()
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
  @ApiProperty()
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @OneToMany('KnowledgeChunk', 'knowledgebase')
  chunks: any[];
}
