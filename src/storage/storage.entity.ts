import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  Index,
} from 'typeorm';
import { Block } from './block.entity';

@Entity('storage')
@Index(['userId'])
@Index(['organizationId']) // 新增：组织索引
@Index(['departmentId']) // 新增：部门索引
@Index(['classification']) // 新增：数据分类索引
@Index(['isDeleted', 'organizationId']) // 新增：复合索引
export class Storage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 文件/页面类型 - 核心区分
  @Column()
  type: 'file' | 'page' | 'database' | 'template';

  @Column({ type: 'varchar', length: 255 })
  filename: string;

  @Column({ type: 'varchar', length: 255 })
  filepath: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  filetype: string; // 对于page类型可能为空

  @Column({ type: 'bigint', default: 0 })
  filesize: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  url: string; // 文件URL，对于page类型可能为空

  @Column({ type: 'uuid' })
  userId: string;

  // === 企业级组织隔离 - 新增 ===
  @Column({ type: 'uuid', nullable: true })
  organizationId?: string; // 所属组织

  @Column({ type: 'uuid', nullable: true })
  departmentId?: string; // 所属部门

  @Column({ type: 'uuid', nullable: true })
  projectId?: string; // 所属项目

  // 数据分类和治理
  @Column({ 
    type: 'enum', 
    enum: ['public', 'internal', 'confidential', 'secret'], 
    default: 'internal' 
  })
  classification: 'public' | 'internal' | 'confidential' | 'secret';

  @Column({ type: 'simple-array', nullable: true })
  dataTags?: string[]; // 数据标签：PII, 财务, 技术等

  @Column({ type: 'uuid', nullable: true })
  dataOwner?: string; // 数据拥有者

  @Column({ type: 'uuid', nullable: true })
  dataSteward?: string; // 数据管理员

  // 合规和审计
  @Column({ type: 'simple-array', nullable: true })
  complianceLabels?: string[]; // GDPR, SOX, HIPAA等

  @Column({ type: 'timestamp', nullable: true })
  retentionUntil?: Date; // 数据保留期限

  @Column({ type: 'boolean', default: false })
  requiresApproval?: boolean; // 是否需要审批访问

  @Column({ type: 'uuid', nullable: true })
  storage_dir_id?: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  // === Notion风格页面属性 ===
  @Column({ type: 'json', nullable: true })
  pageProperties: {
    // 页面外观
    coverUrl?: string;      // 页面封面
    coverPosition?: number; // 封面位置百分比
    icon?: string;          // 页面图标 (emoji或图片URL)
    
    // 页面设置
    title?: string;         // 页面标题 (可能与filename不同)
    description?: string;   // 页面描述
    category?: string;      // 页面分类/标签
    
    // 模板相关
    templateId?: string;    // 使用的模板ID
    isTemplate?: boolean;   // 是否为模板页面
    
    // 视图设置 (for database type)
    defaultView?: 'page' | 'table' | 'board' | 'calendar' | 'gallery' | 'timeline';
    views?: Array<{
      id: string;
      name: string;
      type: 'table' | 'board' | 'calendar' | 'gallery' | 'timeline';
      filters: any[];
      sorts: any[];
      groupBy?: string;
    }>;
    
    // 数据库模式 (for database type)
    databaseSchema?: {
      properties: Record<string, {
        id: string;
        name: string;
        type: 'title' | 'rich_text' | 'number' | 'select' | 'multi_select' | 
              'date' | 'person' | 'checkbox' | 'url' | 'email' | 'phone' | 
              'formula' | 'relation' | 'rollup' | 'created_time' | 'created_by' | 
              'last_edited_time' | 'last_edited_by';
        options?: any;
      }>;
    };
    
    // 自定义属性
    customProperties?: Record<string, any>;
  };

  // 关联的块
  @OneToMany(() => Block, block => block.storage)
  blocks: Block[];

  // 关联的知识库 - 反向关系
  @ManyToMany('Knowledgebase', 'includedFiles')
  knowledgeBases: any[];

  // === 企业级协作功能 - 增强 ===
  @Column({ type: 'simple-array', nullable: true })
  sharedWith?: string[]; // 共享给的用户ID列表

  @Column({ type: 'simple-json', nullable: true })
  sharePermissions?: Array<{
    userId?: string;
    organizationId?: string; // 新增：组织级共享
    departmentId?: string; // 新增：部门级共享
    roleId?: string; // 新增：角色级共享
    permission: 'read' | 'comment' | 'write' | 'admin';
    inheritanceBlocked?: boolean; // 是否阻止权限继承
    expiresAt?: Date; // 新增：权限过期时间
    conditions?: Array<{ // 新增：条件权限
      type: 'ip' | 'time' | 'location';
      value: any;
    }>;
  }>;

  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  @Column({ type: 'varchar', length: 32, default: 'private' })
  publishStatus: 'private' | 'shared' | 'public' | 'published'; // 发布状态

  // === 企业级审批流程 - 新增 ===
  @Column({ 
    type: 'enum', 
    enum: ['draft', 'pending_review', 'approved', 'rejected', 'published'], 
    default: 'draft' 
  })
  approvalStatus?: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published';

  @Column({ type: 'simple-json', nullable: true })
  approvalFlow?: Array<{
    step: number;
    approverRole: string;
    approverId?: string;
    status: 'pending' | 'approved' | 'rejected';
    comment?: string;
    timestamp?: Date;
  }>;

  // === 文件特定属性 ===
  @Column({ type: 'varchar', length: 255, nullable: true })
  previewUrl?: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: {
    // 媒体文件属性
    width?: number;
    height?: number;
    duration?: number;
    thumbnail?: string;
    
    // 文档属性
    wordCount?: number;
    pageCount?: number;
    language?: string;
    
    // 提取的内容
    extractedText?: string;
    extractedMetadata?: Record<string, any>;
    
    // AI生成的属性
    autoTags?: string[];
    summary?: string;
    
    // 企业级元数据
    businessContext?: {
      department: string;
      project: string;
      businessValue: number;
      criticality: 'low' | 'medium' | 'high' | 'critical';
    };
    
    [key: string]: any;
  };

  // === 索引和搜索 ===
  @Column({ type: 'text', nullable: true })
  searchText: string; // 用于全文搜索的预处理文本

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[]; // 标签系统

  // === 企业级状态管理 - 增强 ===
  @Column({ type: 'boolean', default: false })
  isArchived: boolean; // 是否归档

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean; // 软删除

  @Column({ type: 'boolean', default: false })
  isFavorite: boolean; // 是否收藏

  @Column({ type: 'timestamp', nullable: true })
  lastAccessedAt?: Date; // 最后访问时间

  @Column({ type: 'uuid', nullable: true })
  lastAccessedBy?: string; // 最后访问者

  // 数据生命周期管理
  @Column({ type: 'timestamp', nullable: true })
  archivedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  archivedBy?: string;

  @Column({ type: 'text', nullable: true })
  archiveReason?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
