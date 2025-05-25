import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { LlmProvider } from './llm-provider.entity';

@Entity('llm_model')
export class LlmModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  label: string;

  @Column({ nullable: true })
  icon: string;

  @Column({ nullable: true })
  description: string;

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column()
  userId: string;

  @ApiProperty({ type: () => LlmProvider })
  @ManyToOne(() => LlmProvider, (provider) => provider.models)
  provider: LlmProvider;

  @ApiProperty()
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
  @ApiProperty()
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @Column({ nullable: true })
  license: string;

  @Column('json', { nullable: true })
  params: Record<string, any>;

  @Column({ default: false })
  is_default: boolean;

  @Column({ default: false })
  isPublic: boolean;
}
