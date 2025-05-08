import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { LlmProvider } from '../entities/llm-provider.entity';

@Entity('llm_model')
export class LlmModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  icon: string;

  @Column({ nullable: true })
  description: string;

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column()
  user_id: string;

  @ApiProperty({ type: () => LlmProvider })
  @ManyToOne(() => LlmProvider, provider => provider.models)
  provider: LlmProvider;

  @ApiProperty() @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @ApiProperty() @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @Column({ nullable: true })
  license: string;

  @Column('json', { nullable: true })
  params: Record<string, any>;
}
