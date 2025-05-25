import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Agent } from '../../agent/entities/agent.entity';
import { CollaborationTask } from './collaboration-task.entity';

export enum EvaluationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum EvaluationResult {
  PASS = 'pass',
  FAIL = 'fail',
  NEEDS_IMPROVEMENT = 'needs_improvement',
  EXCELLENT = 'excellent',
}

@Entity('task_evaluation')
export class TaskEvaluation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CollaborationTask, (task) => task.evaluations)
  task: CollaborationTask;

  @ManyToOne(() => Agent)
  evaluatorAgent: Agent;

  @Column({
    type: 'varchar',
    enum: EvaluationStatus,
    default: EvaluationStatus.PENDING,
  })
  status: EvaluationStatus;

  @Column({
    type: 'varchar',
    enum: EvaluationResult,
    nullable: true,
  })
  result?: EvaluationResult;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  score?: number; // 0.00 - 1.00

  @Column({ type: 'text', nullable: true })
  feedback?: string;

  @Column({ type: 'text', nullable: true })
  suggestions?: string;

  @Column({ type: 'json', nullable: true })
  criteria?: {
    completeness?: {
      score: number;
      feedback: string;
    };
    quality?: {
      score: number;
      feedback: string;
    };
    accuracy?: {
      score: number;
      feedback: string;
    };
    usability?: {
      score: number;
      feedback: string;
    };
    performance?: {
      score: number;
      feedback: string;
    };
    custom?: Array<{
      name: string;
      score: number;
      feedback: string;
      weight?: number;
    }>;
  };

  @Column({ type: 'json', nullable: true })
  metadata?: {
    evaluationModel?: string;
    evaluationPrompt?: string;
    evaluationTime?: number;
    confidence?: number;
    version?: string;
    tags?: string[];
  };

  @Column({ type: 'boolean', default: false })
  isApproved: boolean;

  @Column({ type: 'boolean', default: false })
  requiresRevision: boolean;

  @Column({ type: 'text', nullable: true })
  revisionRequests?: string;

  @Column({ type: 'timestamp', nullable: true })
  evaluatedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
