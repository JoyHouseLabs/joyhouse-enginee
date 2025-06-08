import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Storage } from './storage.entity';

// 数据血缘节点
@Entity('data_lineage_nodes')
@Index(['storageId'])
@Index(['nodeType'])
@Index(['organizationId'])
export class DataLineageNode {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ type: 'uuid' })
  storageId: string;

  @ApiPropertyOptional()
  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;

  // 节点类型
  @ApiProperty()
  @Column({ 
    type: 'enum', 
    enum: ['source', 'intermediate', 'destination', 'derived', 'aggregated'] 
  })
  nodeType: 'source' | 'intermediate' | 'destination' | 'derived' | 'aggregated';

  // 数据源信息
  @ApiProperty()
  @Column('jsonb')
  sourceInfo: {
    // 原始来源
    originalSource: {
      type: 'file_upload' | 'api_import' | 'database_sync' | 'web_scraping' | 'user_input' | 'ai_generated';
      location?: string; // URL, file path, etc.
      timestamp: Date;
      importMethod?: string;
    };
    
    // 数据提供者
    provider?: {
      userId?: string;
      systemId?: string;
      externalSource?: string;
      confidence: number; // 0-1, 数据可信度
    };
    
    // 数据质量
    quality: {
      completeness: number; // 0-1
      accuracy: number; // 0-1
      consistency: number; // 0-1
      timeliness: number; // 0-1
      validity: number; // 0-1
    };
    
    // 数据分类
    classification: {
      sensitivity: 'public' | 'internal' | 'confidential' | 'secret';
      personalData: boolean;
      businessCritical: boolean;
      regulatoryRequirements?: string[];
    };
  };

  // 处理历史
  @ApiPropertyOptional()
  @Column('jsonb', { nullable: true })
  processingHistory?: Array<{
    step: number;
    operation: string; // extract, transform, summarize, vectorize, etc.
    operator: 'system' | 'user' | 'ai';
    operatorId?: string;
    timestamp: Date;
    parameters?: Record<string, any>;
    result?: {
      status: 'success' | 'failure' | 'partial';
      errorMessage?: string;
      metrics?: Record<string, number>;
    };
  }>;

  // 数据影响范围
  @ApiPropertyOptional()
  @Column('jsonb', { nullable: true })
  impactScope?: {
    // 下游依赖
    downstreamCount: number;
    affectedSystems: string[];
    affectedUsers: string[];
    
    // 业务影响
    businessImpact: {
      level: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      affectedProcesses: string[];
    };
    
    // 合规影响
    complianceImpact?: {
      regulations: string[];
      riskLevel: 'low' | 'medium' | 'high';
      requirements: string[];
    };
  };

  // 元数据
  @ApiPropertyOptional()
  @Column('jsonb', { nullable: true })
  metadata?: {
    // 数据模式
    schema?: {
      fields: Array<{
        name: string;
        type: string;
        nullable: boolean;
        description?: string;
      }>;
      primaryKey?: string[];
      indexes?: string[];
    };
    
    // 统计信息
    statistics?: {
      recordCount: number;
      fileSize: number;
      lastUpdated: Date;
      updateFrequency?: string;
    };
    
    // 版本信息
    version?: {
      major: number;
      minor: number;
      patch: number;
      changeLog?: string;
    };
    
    // 标签和注释
    tags?: string[];
    annotations?: Record<string, string>;
  };

  @ManyToOne(() => Storage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storageId' })
  storage: Storage;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// 数据血缘关系
@Entity('data_lineage_edges')
@Index(['sourceNodeId'])
@Index(['targetNodeId'])
@Index(['relationshipType'])
export class DataLineageEdge {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ type: 'uuid' })
  sourceNodeId: string;

  @ApiProperty()
  @Column({ type: 'uuid' })
  targetNodeId: string;

  // 关系类型
  @ApiProperty()
  @Column({ 
    type: 'enum', 
    enum: ['derives_from', 'transforms_to', 'aggregates_from', 'merges_with', 'splits_to', 'references', 'copies_from'] 
  })
  relationshipType: 'derives_from' | 'transforms_to' | 'aggregates_from' | 'merges_with' | 'splits_to' | 'references' | 'copies_from';

  // 转换详情
  @ApiProperty()
  @Column('jsonb')
  transformation: {
    // 转换方法
    method: 'direct_copy' | 'extraction' | 'aggregation' | 'computation' | 'ai_processing' | 'user_manual';
    
    // 转换规则
    rules?: {
      formula?: string;
      algorithm?: string;
      parameters?: Record<string, any>;
      conditions?: Array<{
        field: string;
        operator: string;
        value: any;
      }>;
    };
    
    // 数据映射
    fieldMapping?: Array<{
      sourceField: string;
      targetField: string;
      transformFunction?: string;
      defaultValue?: any;
    }>;
    
    // 质量变化
    qualityImpact?: {
      completeness: number; // -1 to 1, 变化量
      accuracy: number;
      consistency: number;
      timeliness: number;
    };
  };

  // 执行信息
  @ApiProperty()
  @Column('jsonb')
  execution: {
    // 执行者
    executor: 'system' | 'user' | 'ai' | 'workflow';
    executorId?: string;
    
    // 执行时间
    startTime: Date;
    endTime?: Date;
    duration?: number; // milliseconds
    
    // 执行状态
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    
    // 执行结果
    result?: {
      recordsProcessed: number;
      recordsSuccessful: number;
      recordsFailed: number;
      errorMessages?: string[];
      warnings?: string[];
    };
    
    // 性能指标
    performance?: {
      throughput: number; // records per second
      memoryUsage?: number; // MB
      cpuUsage?: number; // percentage
    };
  };

  // 依赖强度
  @ApiProperty()
  @Column({ type: 'float', default: 1.0 })
  dependencyStrength: number; // 0-1, 依赖程度

  // 业务逻辑
  @ApiPropertyOptional()
  @Column('jsonb', { nullable: true })
  businessLogic?: {
    // 业务规则
    rules?: Array<{
      name: string;
      description: string;
      criticality: 'low' | 'medium' | 'high';
    }>;
    
    // 业务上下文
    context?: {
      process: string;
      owner: string;
      purpose: string;
    };
    
    // SLA要求
    sla?: {
      maxLatency: number; // seconds
      minAccuracy: number; // 0-1
      availability: number; // 0-1
    };
  };

  @ManyToOne(() => DataLineageNode, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sourceNodeId' })
  sourceNode: DataLineageNode;

  @ManyToOne(() => DataLineageNode, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'targetNodeId' })
  targetNode: DataLineageNode;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// 数据血缘快照
@Entity('data_lineage_snapshots')
@Index(['organizationId'])
@Index(['snapshotDate'])
export class DataLineageSnapshot {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ type: 'uuid' })
  organizationId: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  description?: string;

  // 快照时间
  @ApiProperty()
  @Column({ type: 'timestamp' })
  snapshotDate: Date;

  // 血缘图数据
  @ApiProperty()
  @Column('jsonb')
  lineageGraph: {
    // 节点列表
    nodes: Array<{
      id: string;
      type: string;
      properties: Record<string, any>;
      position?: { x: number; y: number };
    }>;
    
    // 边列表
    edges: Array<{
      id: string;
      source: string;
      target: string;
      type: string;
      properties: Record<string, any>;
    }>;
    
    // 图统计
    statistics: {
      nodeCount: number;
      edgeCount: number;
      maxDepth: number;
      complexityScore: number;
    };
    
    // 关键路径
    criticalPaths?: Array<{
      path: string[];
      importance: number;
      riskLevel: 'low' | 'medium' | 'high';
    }>;
  };

  // 变化检测
  @ApiPropertyOptional()
  @Column('jsonb', { nullable: true })
  changesSinceLastSnapshot?: {
    // 新增的节点和边
    added: {
      nodes: string[];
      edges: string[];
    };
    
    // 删除的节点和边
    removed: {
      nodes: string[];
      edges: string[];
    };
    
    // 修改的节点和边
    modified: {
      nodes: Array<{ id: string; changes: string[] }>;
      edges: Array<{ id: string; changes: string[] }>;
    };
    
    // 影响分析
    impact: {
      affectedSystems: string[];
      riskAssessment: string;
      recommendedActions: string[];
    };
  };

  // 快照状态
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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 