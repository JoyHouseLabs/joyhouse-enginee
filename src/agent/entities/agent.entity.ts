import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { User } from '../../user/user.entity';
import { Conversation } from './conversation.entity';
import { RoleCard } from './role-card.entity';
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
    model: string;
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

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt?: Date; // 最后使用时间

  @Column({ type: 'integer', default: 0 })
  usageCount?: number; // 使用次数

  @Column({ nullable: true })
  modelId?: string;

  @Column({ nullable: true })
  providerId?: string;

  @Column({ default: false })
  isPublic: boolean;

  @Column({ nullable: true })
  currentRoleCardId?: string; // 当前激活的角色卡片ID

  @Column({ type: 'json', nullable: true })
  shortTermMemory?: {
    context: string; // 当前上下文
    lastInteraction: Date; // 最后交互时间
    activeRole?: string; // 当前激活的角色
    activePrompt?: string; // 当前激活的提示词
  };

  @Column({ type: 'json', nullable: true })
  longTermMemory?: {
    roles: Array<{
      id: string;
      name: string; // 角色名称（如"软件开发工程师"、"产品经理"）
      prompt: string; // 角色对应的提示词
      description?: string; // 角色描述
    }>;
    knowledgeBase?: Array<{
      id: string;
      content: string; // 知识内容
      category?: string; // 知识分类
      lastUpdated: Date; // 最后更新时间
    }>;
  };

  @Column({ type: 'json', nullable: true })
  environmentContext?: {
    collaborators?: Array<{
      agentId: string; // 协作 agent 的 ID
      role: string; // 协作 agent 的角色
      lastSync: Date; // 最后同步时间
    }>;
    sharedContext?: Record<string, any>; // 共享的上下文信息
  };

  @ManyToOne(() => User)
  user: User;

  @OneToMany(() => Conversation, (conversation) => conversation.agent)
  conversations: Conversation[];

  @ManyToMany(() => RoleCard, roleCard => roleCard.agents)
  @JoinTable({
    name: 'agent_role_cards',
    joinColumn: { name: 'agentId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'roleCardId', referencedColumnName: 'id' }
  })
  roleCards: RoleCard[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
