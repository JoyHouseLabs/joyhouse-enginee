import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/user.entity';
import { Agent } from '../../agent/entities/agent.entity';

export enum AgentRole {
  COORDINATOR = 'coordinator',
  REQUIREMENT_ANALYST = 'requirement_analyst',
  WORK_AGENT = 'work_agent',
  EVALUATOR = 'evaluator',
}

export enum AgentSpecialization {
  SOFTWARE_DEVELOPMENT = 'software_development',
  IMAGE_GENERATION = 'image_generation',
  DOCUMENT_CREATION = 'document_creation',
  DATA_ANALYSIS = 'data_analysis',
  RESEARCH = 'research',
  QUALITY_ASSURANCE = 'quality_assurance',
  PROJECT_MANAGEMENT = 'project_management',
  GENERAL = 'general',
}

@Entity('specialized_agent')
export class SpecializedAgent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Agent)
  @JoinColumn()
  baseAgent: Agent;

  @Column({
    type: 'varchar',
    enum: AgentRole,
  })
  role: AgentRole;

  @Column({
    type: 'varchar',
    enum: AgentSpecialization,
    default: AgentSpecialization.GENERAL,
  })
  specialization: AgentSpecialization;

  @ManyToOne(() => User)
  owner: User;

  @Column({ type: 'json', nullable: true })
  capabilities?: {
    canAnalyzeRequirements?: boolean;
    canCreatePlans?: boolean;
    canExecuteTasks?: boolean;
    canEvaluateResults?: boolean;
    canCoordinate?: boolean;
    supportedTaskTypes?: string[];
    supportedFileTypes?: string[];
    maxConcurrentTasks?: number;
  };

  @Column({ type: 'json', nullable: true })
  configuration?: {
    // 需求分析Agent配置
    requirementAnalysis?: {
      analysisPrompt?: string;
      clarificationQuestions?: string[];
      outputFormat?: string;
      includeUserStories?: boolean;
      includeAcceptanceCriteria?: boolean;
    };

    // 协调Agent配置
    coordination?: {
      planningPrompt?: string;
      delegationStrategy?: 'round_robin' | 'capability_based' | 'load_balanced';
      maxParallelTasks?: number;
      escalationRules?: Array<{
        condition: string;
        action: string;
        target?: string;
      }>;
    };

    // 工作Agent配置
    execution?: {
      workPrompt?: string;
      toolPreferences?: string[];
      workflowPreferences?: string[];
      qualityChecks?: boolean;
      progressReporting?: boolean;
      errorHandling?: 'retry' | 'escalate' | 'fail';
    };

    // 评估Agent配置
    evaluation?: {
      evaluationPrompt?: string;
      scoringCriteria?: Array<{
        name: string;
        weight: number;
        description: string;
      }>;
      passThreshold?: number;
      detailedFeedback?: boolean;
      suggestImprovements?: boolean;
    };
  };

  @Column({ type: 'json', nullable: true })
  performance?: {
    tasksCompleted?: number;
    averageRating?: number;
    successRate?: number;
    averageResponseTime?: number;
    lastActiveAt?: Date;
    totalWorkingTime?: number;
  };

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isAvailable: boolean;

  @Column({ type: 'integer', default: 0 })
  currentLoad: number;

  @Column({ type: 'integer', default: 5 })
  maxLoad: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
