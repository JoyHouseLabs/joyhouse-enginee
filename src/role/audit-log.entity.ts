import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// 企业级审计日志
@Entity('audit_logs')
@Index(['userId'])
@Index(['organizationId'])
@Index(['resourceType'])
@Index(['action'])
@Index(['timestamp'])
@Index(['riskLevel'])
export class AuditLog {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 操作主体
  @ApiProperty()
  @Column({ type: 'varchar', length: 64 })
  userId: string;

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 64, nullable: true })
  organizationId?: string;

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 64, nullable: true })
  departmentId?: string;

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 64, nullable: true })
  roleId?: string;

  // 操作信息
  @ApiProperty()
  @Column({ type: 'varchar', length: 128 })
  action: string; // CREATE_FILE, DELETE_KB, SHARE_DOCUMENT等

  @ApiProperty()
  @Column({ type: 'varchar', length: 64 })
  resourceType: string; // storage, knowledgebase, workflow等

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 64, nullable: true })
  resourceId?: string;

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 255, nullable: true })
  resourceName?: string;

  // 操作结果
  @ApiProperty()
  @Column({ 
    type: 'enum', 
    enum: ['success', 'failure', 'partial'], 
    default: 'success' 
  })
  result: 'success' | 'failure' | 'partial';

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  resultMessage?: string;

  // 详细信息
  @ApiPropertyOptional()
  @Column('jsonb', { nullable: true })
  details?: {
    // 操作前后的值
    before?: any;
    after?: any;
    
    // 请求信息
    requestId?: string;
    endpoint?: string;
    method?: string;
    userAgent?: string;
    
    // 会话信息
    sessionId?: string;
    
    // 业务上下文
    businessContext?: {
      workflow?: string;
      campaign?: string;
      project?: string;
    };
    
    // 其他元数据
    metadata?: Record<string, any>;
  };

  // 安全和风险
  @ApiProperty()
  @Column({ 
    type: 'enum', 
    enum: ['low', 'medium', 'high', 'critical'], 
    default: 'low' 
  })
  riskLevel: 'low' | 'medium' | 'high' | 'critical';

  @ApiPropertyOptional()
  @Column({ type: 'simple-array', nullable: true })
  securityTags?: string[]; // PII_ACCESS, ADMIN_ACTION, BULK_OPERATION等

  @ApiPropertyOptional()
  @Column({ type: 'boolean', default: false })
  isSuspicious?: boolean; // 是否可疑操作

  // 合规性
  @ApiPropertyOptional()
  @Column({ type: 'simple-array', nullable: true })
  complianceEvents?: string[]; // GDPR_ACCESS, SOX_CHANGE等

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 64, nullable: true })
  regulatoryCategory?: string; // 监管分类

  // 网络和地理信息
  @ApiProperty()
  @Column({ type: 'varchar', length: 45 })
  ipAddress: string;

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 255, nullable: true })
  userAgent?: string;

  @ApiPropertyOptional()
  @Column('jsonb', { nullable: true })
  geolocation?: {
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };

  // 时间戳 (使用CreateDateColumn确保不可修改)
  @ApiProperty()
  @CreateDateColumn()
  timestamp: Date;

  @ApiPropertyOptional()
  @Column({ type: 'timestamp', nullable: true })
  processedAt?: Date; // 处理时间 (用于批量处理)
}

// 数据访问日志 (专门记录敏感数据访问)
@Entity('data_access_logs')
@Index(['userId'])
@Index(['dataClassification'])
@Index(['accessTime'])
@Index(['organizationId'])
export class DataAccessLog {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 64 })
  userId: string;

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 64, nullable: true })
  organizationId?: string;

  // 访问的资源
  @ApiProperty()
  @Column({ type: 'varchar', length: 64 })
  resourceType: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 64 })
  resourceId: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 255 })
  resourceName: string;

  // 数据分类
  @ApiProperty()
  @Column({ 
    type: 'enum', 
    enum: ['public', 'internal', 'confidential', 'secret'] 
  })
  dataClassification: 'public' | 'internal' | 'confidential' | 'secret';

  @ApiPropertyOptional()
  @Column({ type: 'simple-array', nullable: true })
  dataTags?: string[]; // PII, FINANCIAL, TECHNICAL等

  // 访问详情
  @ApiProperty()
  @Column({ 
    type: 'enum', 
    enum: ['view', 'download', 'edit', 'share', 'delete'] 
  })
  accessType: 'view' | 'download' | 'edit' | 'share' | 'delete';

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  accessReason?: string; // 访问理由

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 64, nullable: true })
  approvedBy?: string; // 批准人 (如需审批)

  // 访问上下文
  @ApiPropertyOptional()
  @Column('jsonb', { nullable: true })
  context?: {
    businessJustification?: string;
    projectId?: string;
    caseId?: string;
    urgency?: 'low' | 'medium' | 'high';
    expectedUsage?: string;
  };

  // 技术信息
  @ApiProperty()
  @Column({ type: 'varchar', length: 45 })
  ipAddress: string;

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 255, nullable: true })
  userAgent?: string;

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 64, nullable: true })
  sessionId?: string;

  // 合规性
  @ApiPropertyOptional()
  @Column({ type: 'simple-array', nullable: true })
  complianceFlags?: string[]; // GDPR, CCPA, HIPAA等

  @ApiPropertyOptional()
  @Column({ type: 'boolean', default: false })
  requiresNotification?: boolean; // 是否需要通知数据主体

  @ApiProperty()
  @CreateDateColumn()
  accessTime: Date;

  @ApiPropertyOptional()
  @Column({ type: 'timestamp', nullable: true })
  accessEndTime?: Date; // 访问结束时间
}

// 系统操作日志 (记录系统级操作)
@Entity('system_operation_logs')
@Index(['operationType'])
@Index(['severity'])
@Index(['timestamp'])
export class SystemOperationLog {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 操作信息
  @ApiProperty()
  @Column({ type: 'varchar', length: 128 })
  operationType: string; // BACKUP, RESTORE, MIGRATION, MAINTENANCE等

  @ApiProperty()
  @Column({ type: 'varchar', length: 128 })
  component: string; // DATABASE, STORAGE, AI_SERVICE等

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 64, nullable: true })
  operatorId?: string; // 操作人员

  // 操作详情
  @ApiProperty()
  @Column('jsonb')
  details: {
    command?: string;
    parameters?: Record<string, any>;
    duration?: number; // 操作耗时 (秒)
    affectedRecords?: number;
    dataSize?: number; // 处理的数据大小 (bytes)
  };

  // 结果和状态
  @ApiProperty()
  @Column({ 
    type: 'enum', 
    enum: ['success', 'failure', 'partial', 'cancelled'] 
  })
  status: 'success' | 'failure' | 'partial' | 'cancelled';

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  stackTrace?: string;

  // 严重程度
  @ApiProperty()
  @Column({ 
    type: 'enum', 
    enum: ['info', 'warning', 'error', 'critical'] 
  })
  severity: 'info' | 'warning' | 'error' | 'critical';

  // 业务影响
  @ApiPropertyOptional()
  @Column('jsonb', { nullable: true })
  businessImpact?: {
    affectedUsers?: number;
    affectedOrganizations?: string[];
    serviceDowntime?: number; // 秒
    estimatedLoss?: number; // 估计损失
  };

  @ApiProperty()
  @CreateDateColumn()
  timestamp: Date;
} 