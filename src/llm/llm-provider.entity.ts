import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { LlmModel } from './llm-model.entity';

export type LlmApiType = 'ollama' | 'openai';

@Entity('llm_provider')
export class LlmProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column()
  baseUrl: string;

  @Column({ nullable: true })
  apiKey: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  icon: string;

  @Column({ default: true })
  status: boolean;

  @ApiProperty({ description: 'api类型', enum: ['ollama', 'openai'] })
  @Column({ type: 'varchar', length: 32 })
  apiType: LlmApiType;

  @ApiProperty()
  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ApiProperty()
  @Column({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @Column()
  user_id: string;

  @OneToMany(() => LlmModel, (model) => model.provider)
  models: LlmModel[];
}
