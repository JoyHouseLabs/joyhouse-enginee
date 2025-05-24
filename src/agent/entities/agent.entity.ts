import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../user/user.entity';
import { Conversation } from './conversation.entity';
import { IntentRecognitionConfig } from '../dto/agent.dto';

@Entity('agent')
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  icon?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'json', nullable: true })
  llmParams?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stop?: string[];
  };

  @Column({ type: 'json', nullable: true })
  intentRecognition?: IntentRecognitionConfig;

  @Column({ type: 'json', nullable: true })
  enabledTools?: string[]; // 启用的工具ID列表

  @Column({ type: 'json', nullable: true })
  enabledMcpTools?: string[]; // 启用的MCP工具ID列表（格式：serverName:toolName）

  @Column({ type: 'json', nullable: true })
  enabledWorkflows?: string[]; // 启用的工作流ID列表

  @Column({ type: 'boolean', default: false })
  enableRealTimeMonitoring?: boolean; // 是否启用实时监控

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>; // 额外的元数据

  @Column({ type: 'datetime', nullable: true })
  lastUsedAt?: Date; // 最后使用时间

  @Column({ type: 'integer', default: 0 })
  usageCount?: number; // 使用次数

  @ManyToOne(() => User)
  user: User;

  @OneToMany(() => Conversation, (conversation) => conversation.agent)
  conversations: Conversation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
