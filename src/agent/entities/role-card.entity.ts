import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { User } from '../../user/user.entity';
import { Agent } from './agent.entity';

@Entity('role_card')
export class RoleCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // 角色名称，如"软件开发工程师"、"产品经理"、"英语教练"

  @Column({ type: 'text', nullable: true })
  description?: string; // 角色描述

  @Column({ type: 'text' })
  systemPrompt: string; // 系统提示词

  @Column({ type: 'text', nullable: true })
  userPrompt?: string; // 用户提示词模板

  @Column({ type: 'json', nullable: true })
  shortTermMemoryConfig?: {
    maxContextLength: number; // 短期记忆最大长度
    contextRetentionTime: number; // 上下文保留时间（分钟）
    priorityKeywords: string[]; // 优先保留的关键词
  };

  @Column({ type: 'json', nullable: true })
  longTermMemoryConfig?: {
    knowledgeCategories: string[]; // 知识分类
    memoryRetentionDays: number; // 记忆保留天数
    autoSummarize: boolean; // 是否自动总结
  };

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
  intentRecognitionConfig?: {
    enabled: boolean;
    confidence_threshold: number;
    max_intents: number;
    custom_intents: Array<{
      id: string;
      name: string;
      description: string;
      examples: string[];
      required_parameters: string[];
    }>;
  };

  @Column({ type: 'json', nullable: true })
  enabledTools?: string[]; // 启用的工具ID列表

  @Column({ type: 'json', nullable: true })
  enabledMcpTools?: string[]; // 启用的MCP工具ID列表

  @Column({ type: 'json', nullable: true })
  enabledWorkflows?: string[]; // 启用的工作流ID列表

  @Column({ type: 'json', nullable: true })
  enabledKnowledgeBases?: string[]; // 启用的知识库ID列表

  @Column({ type: 'json', nullable: true })
  roleSpecificSettings?: {
    autoGreeting?: string; // 自动问候语
    conversationStyle?: 'formal' | 'casual' | 'professional' | 'friendly';
    responseLength?: 'short' | 'medium' | 'long';
    expertise_level?: 'beginner' | 'intermediate' | 'expert';
    language_preference?: string;
  };

  @Column({ default: true })
  isActive: boolean; // 是否激活

  @Column({ default: false })
  isPublic: boolean; // 是否公开（其他用户可以使用）

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>; // 额外的元数据

  @ManyToOne(() => User)
  user: User; // 创建者

  @ManyToMany(() => Agent, agent => agent.roleCards)
  agents: Agent[]; // 使用此角色卡的 agents

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 