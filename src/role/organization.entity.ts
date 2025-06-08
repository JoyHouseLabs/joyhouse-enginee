import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn, Index, Tree, TreeParent, TreeChildren } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// 企业组织架构实体
@Entity('organizations')
@Tree('nested-set') // 使用嵌套集合模型支持树形结构
@Index(['code'])
@Index(['type'])
@Index(['parentId'])
export class Organization {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 64, unique: true })
  code: string; // 组织编码，如 SALES_001

  @ApiProperty()
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  description?: string;

  // 组织类型
  @ApiProperty()
  @Column({ 
    type: 'enum', 
    enum: ['company', 'division', 'department', 'team', 'project', 'group'], 
    default: 'department' 
  })
  type: 'company' | 'division' | 'department' | 'team' | 'project' | 'group';

  // 组织级别 (1为最高级)
  @ApiProperty()
  @Column({ type: 'int', default: 1 })
  level: number;

  // 排序权重
  @ApiProperty()
  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  // 组织状态
  @ApiProperty()
  @Column({ 
    type: 'enum', 
    enum: ['active', 'inactive', 'archived'], 
    default: 'active' 
  })
  status: 'active' | 'inactive' | 'archived';

  // 组织配置
  @ApiPropertyOptional()
  @Column('jsonb', { nullable: true })
  config?: {
    // 数据权限配置
    dataPermissions: {
      inherit: boolean; // 是否继承父级权限
      isolate: boolean; // 是否数据隔离
      crossDepartmentAccess: boolean; // 是否允许跨部门访问
    };
    
    // 知识库配置
    knowledgeConfig: {
      autoCreateKB: boolean; // 是否自动创建知识库
      kbNamingPattern: string; // 知识库命名模式
      defaultKBType: string; // 默认知识库类型
      inheritParentKB: boolean; // 是否继承父级知识库
    };
    
    // 工作流配置
    workflowConfig: {
      approvalRequired: boolean; // 是否需要审批
      approvers: string[]; // 审批人角色
      escalationLevel: number; // 升级层级
    };
    
    // 其他配置
    features?: string[]; // 启用的功能
    limits?: {
      maxUsers: number;
      maxStorage: number; // MB
      maxKnowledgeBases: number;
    };
  };

  // 负责人
  @ApiPropertyOptional()
  @Column({ type: 'uuid', nullable: true })
  managerId?: string;

  @ApiPropertyOptional()
  @Column({ type: 'simple-array', nullable: true })
  adminIds?: string[]; // 管理员用户ID列表

  // 联系信息
  @ApiPropertyOptional()
  @Column('jsonb', { nullable: true })
  contact?: {
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
  };

  // 树形结构关系
  @TreeParent()
  parent: Organization;

  @TreeChildren()
  children: Organization[];

  // 传统父子关系 (作为备用)
  @ApiPropertyOptional()
  @Column({ type: 'uuid', nullable: true })
  parentId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// 用户组织关系
@Entity('user_organizations')
@Index(['userId'])
@Index(['organizationId'])
@Index(['role'])
export class UserOrganization {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ type: 'uuid' })
  userId: string;

  @ApiProperty()
  @Column({ type: 'uuid' })
  organizationId: string;

  // 在组织中的角色
  @ApiProperty()
  @Column({ type: 'uuid' })
  role: string; // 关联到Role实体的ID

  // 职位信息
  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 255, nullable: true })
  position?: string; // 职位名称

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 255, nullable: true })
  title?: string; // 职务头衔

  // 权限范围
  @ApiPropertyOptional()
  @Column('jsonb', { nullable: true })
  scope?: {
    dataAccess: string[]; // 可访问的数据类型
    departments: string[]; // 可访问的部门
    projects: string[]; // 可访问的项目
    knowledgeBases: string[]; // 可访问的知识库
  };

  // 关系状态
  @ApiProperty()
  @Column({ 
    type: 'enum', 
    enum: ['active', 'inactive', 'pending', 'suspended'], 
    default: 'active' 
  })
  status: 'active' | 'inactive' | 'pending' | 'suspended';

  @ApiPropertyOptional()
  @Column({ type: 'timestamp', nullable: true })
  effectiveFrom?: Date; // 生效日期

  @ApiPropertyOptional()
  @Column({ type: 'timestamp', nullable: true })
  effectiveTo?: Date; // 失效日期

  // 是否为主要组织 (用户可能属于多个组织)
  @ApiProperty()
  @Column({ type: 'boolean', default: false })
  isPrimary: boolean;

  // 关联关系
  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// 组织数据权限
@Entity('organization_data_permissions')
@Index(['organizationId'])
@Index(['resourceType'])
export class OrganizationDataPermission {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ type: 'uuid' })
  organizationId: string;

  // 资源类型
  @ApiProperty()
  @Column({ type: 'varchar', length: 64 })
  resourceType: string; // storage, knowledgebase, workflow 等

  @ApiPropertyOptional()
  @Column({ type: 'uuid', nullable: true })
  resourceId?: string; // 具体资源ID，null表示类型级权限

  // 权限级别
  @ApiProperty()
  @Column({ 
    type: 'enum', 
    enum: ['none', 'read', 'write', 'admin', 'owner'], 
    default: 'none' 
  })
  permission: 'none' | 'read' | 'write' | 'admin' | 'owner';

  // 权限来源
  @ApiProperty()
  @Column({ 
    type: 'enum', 
    enum: ['direct', 'inherited', 'shared'], 
    default: 'direct' 
  })
  source: 'direct' | 'inherited' | 'shared';

  // 权限约束
  @ApiPropertyOptional()
  @Column('jsonb', { nullable: true })
  constraints?: {
    timeRange?: {
      start: Date;
      end: Date;
    };
    ipWhitelist?: string[];
    conditions?: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
  };

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 