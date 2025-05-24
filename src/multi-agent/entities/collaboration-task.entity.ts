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
import { Agent } from '../../agent/entities/agent.entity';
import { CollaborationRoom } from './collaboration-room.entity';
import { TaskStep } from './task-step.entity';
import { TaskEvaluation } from './task-evaluation.entity';

export enum TaskStatus {
  PENDING = 'pending',
  REQUIREMENT_ANALYSIS = 'requirement_analysis',
  REQUIREMENT_CONFIRMATION = 'requirement_confirmation',
  PLANNING = 'planning',
  EXECUTION = 'execution',
  EVALUATION = 'evaluation',
  REVISION = 'revision',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum TaskType {
  SOFTWARE_DEVELOPMENT = 'software_development',
  IMAGE_GENERATION = 'image_generation',
  DOCUMENT_CREATION = 'document_creation',
  DATA_ANALYSIS = 'data_analysis',
  RESEARCH = 'research',
  CUSTOM = 'custom',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('collaboration_task')
export class CollaborationTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  originalRequirement: string;

  @Column({ type: 'text', nullable: true })
  analyzedRequirement?: string;

  @Column({ type: 'text', nullable: true })
  executionPlan?: string;

  @Column({
    type: 'varchar',
    enum: TaskStatus,
    default: TaskStatus.PENDING,
  })
  status: TaskStatus;

  @Column({
    type: 'varchar',
    enum: TaskType,
    default: TaskType.CUSTOM,
  })
  type: TaskType;

  @Column({
    type: 'varchar',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @ManyToOne(() => CollaborationRoom, (room) => room.tasks)
  room: CollaborationRoom;

  @ManyToOne(() => User)
  creator: User;

  @ManyToOne(() => Agent, { nullable: true })
  coordinatorAgent?: Agent;

  @ManyToOne(() => Agent, { nullable: true })
  requirementAnalysisAgent?: Agent;

  @ManyToOne(() => Agent, { nullable: true })
  workAgent?: Agent;

  @OneToMany(() => TaskStep, (step) => step.task)
  steps: TaskStep[];

  @OneToMany(() => TaskEvaluation, (evaluation) => evaluation.task)
  evaluations: TaskEvaluation[];

  @Column({ type: 'json', nullable: true })
  context?: {
    attachments?: Array<{
      id: string;
      name: string;
      type: string;
      url: string;
      size: number;
    }>;
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
    summary?: string;
    metrics?: Record<string, any>;
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
