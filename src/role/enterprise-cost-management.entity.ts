import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Organization } from './organization.entity';

// 企业成本管理
@Entity('cost_centers')
@Index(['organizationId'])
@Index(['type'])
export class CostCenter {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ type: 'uuid' })
  organizationId: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 64, unique: true })
  code: string; // 成本中心编码

  @ApiProperty()
  @Column({ type: 'varchar', length: 255 })
  name: string;

  // 成本中心类型
  @ApiProperty()
  @Column({ 
    type: 'enum', 
    enum: ['department', 'project', 'team', 'service'], 
    default: 'department' 
  })
  type: 'department' | 'project' | 'team' | 'service';

  // 预算设置
  @ApiPropertyOptional()
  @Column('jsonb', { nullable: true })
  budget?: {
    // 年度预算
    annual: {
      total: number;
      storage: number;
      ai_services: number;
      infrastructure: number;
      other: number;
    };
    
    // 月度预算
    monthly: {
      total: number;
      storage: number;
      ai_services: number;
      infrastructure: number;
      other: number;
    };
    
    // 预算周期
    fiscalYear: {
      start: string; // YYYY-MM-DD
      end: string; // YYYY-MM-DD
    };
    
    // 预警设置
    alerts: {
      threshold_50: boolean;
      threshold_75: boolean;
      threshold_90: boolean;
      threshold_100: boolean;
      notifyEmails: string[];
    };
  };

  // 成本分摊规则
  @ApiPropertyOptional()
  @Column('jsonb', { nullable: true })
  allocationRules?: {
    // 按用户数分摊
    byUserCount: {
      enabled: boolean;
      weight: number; // 权重 0-1
    };
    
    // 按存储使用量分摊
    byStorageUsage: {
      enabled: boolean;
      weight: number;
    };
    
    // 按AI服务使用量分摊
    byAIUsage: {
      enabled: boolean;
      weight: number;
    };
    
    // 固定分摊
    fixedAllocation: {
      enabled: boolean;
      percentage: number; // 0-100
    };
    
    // 自定义规则
    customRules: Array<{
      name: string;
      formula: string;
      weight: number;
    }>;
  };

  // 负责人
  @ApiPropertyOptional()
  @Column({ type: 'uuid', nullable: true })
  managerId?: string;

  @ApiPropertyOptional()
  @Column({ type: 'simple-array', nullable: true })
  approverIds?: string[];

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// 使用量计费记录
@Entity('usage_billing')
@Index(['costCenterId'])
@Index(['serviceType'])
@Index(['billingPeriod'])
@Index(['userId'])
export class UsageBilling {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ type: 'uuid' })
  costCenterId: string;

  @ApiPropertyOptional()
  @Column({ type: 'uuid', nullable: true })
  userId?: string; // 具体用户（可选）

  @ApiPropertyOptional()
  @Column({ type: 'uuid', nullable: true })
  resourceId?: string; // 具体资源（可选）

  // 服务类型
  @ApiProperty()
  @Column({ type: 'varchar', length: 64 })
  serviceType: string; // storage, embedding, llm, vision, etc.

  @ApiProperty()
  @Column({ type: 'varchar', length: 64 })
  serviceProvider: string; // openai, anthropic, azure, aws, etc.

  // 使用量信息
  @ApiProperty()
  @Column('jsonb')
  usage: {
    // 通用使用量
    quantity: number;
    unit: string; // tokens, MB, GB, requests, hours等
    
    // 具体使用详情
    details?: {
      // AI服务相关
      model?: string;
      inputTokens?: number;
      outputTokens?: number;
      requestCount?: number;
      
      // 存储相关
      storageSize?: number;
      transferSize?: number;
      
      // 计算相关
      cpuHours?: number;
      memoryHours?: number;
      
      // 其他
      [key: string]: any;
    };
  };

  // 计费信息
  @ApiProperty()
  @Column('jsonb')
  billing: {
    // 单价
    unitPrice: number;
    currency: string;
    
    // 总费用
    totalCost: number;
    
    // 费用明细
    breakdown?: {
      baseCost: number;
      additionalCosts: Array<{
        type: string;
        amount: number;
        description: string;
      }>;
    };
    
    // 折扣信息
    discounts?: Array<{
      type: 'volume' | 'contract' | 'promotion';
      amount: number;
      description: string;
    }>;
  };

  // 计费周期
  @ApiProperty()
  @Column({ type: 'varchar', length: 7 }) // YYYY-MM
  billingPeriod: string;

  @ApiProperty()
  @Column({ type: 'date' })
  usageDate: Date;

  // 业务上下文
  @ApiPropertyOptional()
  @Column('jsonb', { nullable: true })
  businessContext?: {
    projectId?: string;
    workflowId?: string;
    knowledgeBaseId?: string;
    sessionId?: string;
    purpose?: string;
  };

  // 计费状态
  @ApiProperty()
  @Column({ 
    type: 'enum', 
    enum: ['pending', 'calculated', 'billed', 'paid'], 
    default: 'pending' 
  })
  status: 'pending' | 'calculated' | 'billed' | 'paid';

  @ManyToOne(() => CostCenter, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'costCenterId' })
  costCenter: CostCenter;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// 成本报告
@Entity('cost_reports')
@Index(['organizationId'])
@Index(['reportPeriod'])
@Index(['reportType'])
export class CostReport {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ type: 'uuid' })
  organizationId: string;

  // 报告类型
  @ApiProperty()
  @Column({ 
    type: 'enum', 
    enum: ['monthly', 'quarterly', 'annual', 'custom'] 
  })
  reportType: 'monthly' | 'quarterly' | 'annual' | 'custom';

  @ApiProperty()
  @Column({ type: 'varchar', length: 255 })
  title: string;

  // 报告周期
  @ApiProperty()
  @Column({ type: 'varchar', length: 20 })
  reportPeriod: string; // YYYY-MM or YYYY-Q1 or YYYY

  @ApiProperty()
  @Column({ type: 'date' })
  periodStart: Date;

  @ApiProperty()
  @Column({ type: 'date' })
  periodEnd: Date;

  // 报告数据
  @ApiProperty()
  @Column('jsonb')
  reportData: {
    // 总览
    summary: {
      totalCost: number;
      budgetUsed: number; // 百分比
      costChange: number; // 与上期对比
      topCostCenters: Array<{
        id: string;
        name: string;
        cost: number;
        percentage: number;
      }>;
    };
    
    // 按服务类型分解
    byServiceType: Array<{
      serviceType: string;
      cost: number;
      usage: number;
      unit: string;
      change: number;
    }>;
    
    // 按成本中心分解
    byCostCenter: Array<{
      costCenterId: string;
      name: string;
      cost: number;
      budget: number;
      utilizationRate: number;
    }>;
    
    // 按时间趋势
    trends: Array<{
      date: string;
      cost: number;
      usage: number;
    }>;
    
    // 异常分析
    anomalies?: Array<{
      type: 'spike' | 'unusual_pattern' | 'budget_overrun';
      description: string;
      impact: number;
      recommendation: string;
    }>;
    
    // 预测
    forecast?: {
      nextPeriodCost: number;
      confidence: number; // 0-1
      factors: string[];
    };
  };

  // 报告状态
  @ApiProperty()
  @Column({ 
    type: 'enum', 
    enum: ['generating', 'completed', 'failed'], 
    default: 'generating' 
  })
  status: 'generating' | 'completed' | 'failed';

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  // 生成信息
  @ApiProperty()
  @Column({ type: 'uuid' })
  generatedBy: string;

  @ApiPropertyOptional()
  @Column({ type: 'simple-array', nullable: true })
  recipients?: string[]; // 报告接收者

  @ApiPropertyOptional()
  @Column({ type: 'timestamp', nullable: true })
  sentAt?: Date;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 