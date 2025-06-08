import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// 模板系统 (Notion 特色)
@Entity('templates')
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  userId: string; // 模板创建者

  @Column({ default: false })
  isPublic: boolean; // 是否公开模板

  @Column()
  category: string; // 模板分类: 'note', 'database', 'page', 'workflow'

  // 模板内容结构
  @Column('jsonb')
  content: {
    // 块结构 (Notion核心)
    blocks: Array<{
      id: string;
      type: 'paragraph' | 'heading' | 'list' | 'quote' | 'code' | 'image' | 'embed' | 'database' | 'callout';
      properties: Record<string, any>;
      content: string;
      children?: string[]; // 子块ID
    }>;
    
    // 数据库模板结构
    databaseSchema?: {
      properties: Record<string, {
        type: 'title' | 'text' | 'number' | 'select' | 'date' | 'checkbox' | 'relation';
        options?: any[];
      }>;
      views: Array<{
        type: 'table' | 'board' | 'calendar' | 'gallery';
        filters: any[];
        sorts: any[];
      }>;
    };
    
    // 关联文件目录结构
    directoryStructure?: Array<{
      dirId: string;
      filePatterns: string[];
      autoImport: boolean;
    }>;
  };

  // 模板封面和图标
  @Column({ nullable: true })
  coverUrl: string;

  @Column({ nullable: true })
  icon: string;

  // 自动应用规则
  @Column('jsonb', { nullable: true })
  autoApplyRules: Array<{
    trigger: 'onCreate' | 'onImport' | 'scheduled';
    conditions: {
      dirId?: string; // 应用到哪个目录
      fileType?: string[]; // 文件类型匹配
      namingPattern?: string; // 文件名模式
      timePattern?: string; // 时间模式 (如每日笔记)
    };
    actions: {
      applyTemplate: boolean;
      createRelations: boolean;
      setProperties: Record<string, any>;
    };
  }>;

  // 使用统计
  @Column({ default: 0 })
  usageCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}