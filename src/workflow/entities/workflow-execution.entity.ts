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
import { Workflow } from './workflow.entity';
import { WorkflowExecutionStep } from './workflow-execution-step.entity';

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  WAITING_INPUT = 'waiting_input',
  WAITING_EVENT = 'waiting_event',
  WAITING_APPROVAL = 'waiting_approval',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('workflow_execution')
export class WorkflowExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'text',
    default: ExecutionStatus.PENDING,
  })
  status: ExecutionStatus;

  @Column({ type: 'text', nullable: true })
  currentNodeId?: string;

  @Column({ type: 'json', nullable: true })
  context?: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  input?: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  output?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ type: 'text', nullable: true })
  triggerType?: string;

  @Column({ type: 'json', nullable: true })
  triggerData?: any;

  @ManyToOne(() => Workflow, (workflow) => workflow.executions)
  workflow: Workflow;

  @ManyToOne(() => User)
  user: User;

  @OneToMany(() => WorkflowExecutionStep, (step) => step.execution)
  steps: WorkflowExecutionStep[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
