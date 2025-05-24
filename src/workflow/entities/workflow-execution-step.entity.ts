import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { WorkflowExecution } from './workflow-execution.entity';

export enum StepStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  WAITING = 'waiting',
}

@Entity('workflow_execution_step')
export class WorkflowExecutionStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nodeId: string;

  @Column()
  nodeType: string;

  @Column()
  nodeLabel: string;

  @Column({
    type: 'text',
    default: StepStatus.PENDING,
  })
  status: StepStatus;

  @Column({ type: 'json', nullable: true })
  input?: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  output?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @Column({ type: 'datetime', nullable: true })
  startedAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt?: Date;

  @Column({ type: 'integer', default: 0 })
  retryCount: number;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @ManyToOne(() => WorkflowExecution, (execution) => execution.steps)
  execution: WorkflowExecution;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
