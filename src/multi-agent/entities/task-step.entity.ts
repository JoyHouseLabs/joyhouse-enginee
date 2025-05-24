import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../../user/user.entity';
import { Agent } from '../../agent/entities/agent.entity';
import { CollaborationTask } from './collaboration-task.entity';

export enum StepType {
  REQUIREMENT_ANALYSIS = 'requirement_analysis',
  PLANNING = 'planning',
  EXECUTION = 'execution',
  EVALUATION = 'evaluation',
  USER_FEEDBACK = 'user_feedback',
  REVISION = 'revision',
  APPROVAL = 'approval',
}

export enum StepStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  WAITING_FOR_APPROVAL = 'waiting_for_approval',
  WAITING_FOR_FEEDBACK = 'waiting_for_feedback',
}

@Entity('task_step')
export class TaskStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'varchar',
    enum: StepType,
  })
  type: StepType;

  @Column({
    type: 'varchar',
    enum: StepStatus,
    default: StepStatus.PENDING,
  })
  status: StepStatus;

  @Column({ type: 'integer' })
  order: number;

  @ManyToOne(() => CollaborationTask, (task) => task.steps)
  task: CollaborationTask;

  @ManyToOne(() => Agent, { nullable: true })
  assignedAgent?: Agent;

  @ManyToOne(() => User, { nullable: true })
  assignedUser?: User;

  @Column({ type: 'text', nullable: true })
  input?: string;

  @Column({ type: 'text', nullable: true })
  output?: string;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'json', nullable: true })
  context?: {
    toolsUsed?: string[];
    workflowsExecuted?: string[];
    mcpToolsUsed?: string[];
    variables?: Record<string, any>;
    metadata?: Record<string, any>;
  };

  @Column({ type: 'json', nullable: true })
  result?: {
    output?: any;
    files?: Array<{
      id: string;
      name: string;
      type: string;
      url: string;
      size: number;
    }>;
    metrics?: Record<string, any>;
    performance?: {
      duration: number;
      memoryUsage?: number;
      cpuUsage?: number;
    };
  };

  @Column({ type: 'datetime', nullable: true })
  startedAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  deadline?: Date;

  @Column({ type: 'integer', default: 0 })
  retryCount: number;

  @Column({ type: 'integer', default: 3 })
  maxRetries: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
