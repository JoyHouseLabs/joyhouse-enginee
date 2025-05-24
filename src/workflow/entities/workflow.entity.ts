import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from '../../user/user.entity';
import { WorkflowExecution } from './workflow-execution.entity';

export enum WorkflowStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

@Entity('workflow')
export class Workflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'text',
    default: WorkflowStatus.DRAFT
  })
  status: WorkflowStatus;

  @Column({ type: 'json' })
  nodes: WorkflowNode[];

  @Column({ type: 'json' })
  edges: WorkflowEdge[];

  @Column({ type: 'json', nullable: true })
  variables?: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  triggers?: WorkflowTrigger[];

  @Column({ type: 'boolean', default: false })
  isTemplate: boolean;

  @ManyToOne(() => User)
  user: User;

  @OneToMany(() => WorkflowExecution, execution => execution.workflow)
  executions: WorkflowExecution[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export interface WorkflowNode {
  id: string;
  type: 'start' | 'end' | 'tool' | 'agent' | 'condition' | 'user_input' | 'wait_event' | 'approval' | 'script' | 'delay' | 'loop_start' | 'loop_end' | 'loop_condition' | 'parallel_start' | 'parallel_end' | 'parallel_branch';
  label: string;
  position: { x: number; y: number };
  data: {
    toolId?: string;
    agentId?: string;
    condition?: string;
    script?: string;
    prompt?: string;
    timeout?: number;
    eventType?: string;
    eventCondition?: any;
    approvers?: string[];
    delayMs?: number;
    loopId?: string;
    maxIterations?: number;
    loopCondition?: string;
    exitCondition?: string;
    exitEventType?: string;
    exitEventCondition?: any;
    exitKeyword?: string;
    parallelId?: string;
    parallelTimeout?: number;
    parallelStrategy?: 'wait_all' | 'wait_any' | 'wait_first';
    branchName?: string;
    aggregationScript?: string;
    failureStrategy?: 'fail_fast' | 'continue_on_error' | 'ignore_errors';
    [key: string]: any;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
  data?: any;
}

export interface WorkflowTrigger {
  type: 'manual' | 'schedule' | 'webhook' | 'event';
  config: {
    cron?: string;
    webhook?: string;
    eventType?: string;
    eventCondition?: any;
  };
} 