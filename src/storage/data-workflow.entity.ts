import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Storage } from './storage.entity';

// 数据工作流实体 - 支持数据的自动化处理和演进
@Entity('data_workflows')
export class DataWorkflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // 工作流类型
  @Column({ 
    type: 'enum', 
    enum: ['import', 'extract', 'summarize', 'analyze', 'evolve', 'sync'], 
    default: 'import' 
  })
  type: 'import' | 'extract' | 'summarize' | 'analyze' | 'evolve' | 'sync';

  // 触发条件
  @Column('jsonb')
  trigger: {
    type: 'manual' | 'schedule' | 'file_upload' | 'content_change' | 'agent_request';
    schedule?: string; // cron表达式
    conditions?: {
      fileTypes?: string[];
      directories?: string[];
      keywords?: string[];
      minSize?: number;
      maxSize?: number;
    };
  };

  // 工作流步骤配置
  @Column('jsonb')
  steps: Array<{
    id: string;
    type: 'import' | 'extract' | 'transform' | 'summarize' | 'vectorize' | 'link' | 'notify';
    config: {
      // 导入步骤
      source?: {
        type: 'file' | 'url' | 'api' | 'database';
        path?: string;
        credentials?: any;
        format?: string;
      };
      
      // 提取步骤
      extractors?: string[]; // 使用的提取器
      
      // 转换步骤
      transformers?: Array<{
        type: 'format' | 'clean' | 'split' | 'merge';
        config: any;
      }>;
      
      // 总结步骤
      summarization?: {
        model: string;
        maxLength: number;
        style: 'brief' | 'detailed' | 'technical' | 'creative';
        language: string;
      };
      
      // 向量化步骤
      vectorization?: {
        model: string;
        chunkSize: number;
        chunkOverlap: number;
      };
      
      // 链接步骤
      linking?: {
        autoLink: boolean;
        linkTypes: string[];
        confidenceThreshold: number;
      };
      
      // 通知步骤
      notification?: {
        channels: string[];
        template: string;
      };
    };
    nextSteps?: string[]; // 下一步骤ID
    errorHandling?: 'skip' | 'retry' | 'stop';
  }>;

  // 输入和输出
  @Column('jsonb', { nullable: true })
  input?: {
    storageIds?: string[];
    directoryIds?: string[];
    externalSources?: Array<{
      type: string;
      url: string;
      credentials?: any;
    }>;
  };

  @Column('jsonb', { nullable: true })
  output?: {
    targetDirectory?: string;
    naming?: string; // 命名模式
    organization?: 'flat' | 'hierarchical' | 'by_date' | 'by_type';
    postProcessing?: string[];
  };

  // 执行状态
  @Column({ 
    type: 'enum', 
    enum: ['inactive', 'active', 'running', 'paused', 'completed', 'failed'], 
    default: 'inactive' 
  })
  status: 'inactive' | 'active' | 'running' | 'paused' | 'completed' | 'failed';

  @Column({ type: 'text', nullable: true })
  statusMessage?: string;

  @Column({ type: 'float', default: 0 })
  progress: number; // 执行进度 0-100

  // 统计信息
  @Column({ type: 'int', default: 0 })
  executionCount: number;

  @Column({ type: 'int', default: 0 })
  successCount: number;

  @Column({ type: 'int', default: 0 })
  failureCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastExecutedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextExecutionAt?: Date;

  // 性能指标
  @Column({ type: 'json', nullable: true })
  metrics?: {
    averageExecutionTime: number;
    averageFilesProcessed: number;
    averageDataSize: number;
    errorRate: number;
    qualityScore: number;
  };

  // 配置选项
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  allowParallelExecution: boolean;

  @Column({ type: 'int', default: 3 })
  maxRetries: number;

  @Column({ type: 'int', default: 3600 })
  timeoutSeconds: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// 工作流执行历史
@Entity('workflow_executions')
export class WorkflowExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workflowId: string;

  @ManyToOne(() => DataWorkflow, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workflowId' })
  workflow: DataWorkflow;

  @Column({ 
    type: 'enum', 
    enum: ['running', 'completed', 'failed', 'cancelled'], 
    default: 'running' 
  })
  status: 'running' | 'completed' | 'failed' | 'cancelled';

  @Column({ type: 'float', default: 0 })
  progress: number;

  @Column({ type: 'text', nullable: true })
  statusMessage?: string;

  // 执行结果
  @Column('jsonb', { nullable: true })
  result?: {
    processedFiles: number;
    createdFiles: number;
    updatedFiles: number;
    generatedSummaries: number;
    createdLinks: number;
    errors: Array<{
      step: string;
      message: string;
      timestamp: Date;
    }>;
    outputFiles: string[]; // 生成的文件ID
  };

  // 性能数据
  @Column({ type: 'int', nullable: true })
  executionTimeMs?: number;

  @Column({ type: 'bigint', nullable: true })
  dataProcessedBytes?: number;

  @Column({ type: 'int', nullable: true })
  memoryUsageMB?: number;

  @CreateDateColumn()
  startedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;
} 