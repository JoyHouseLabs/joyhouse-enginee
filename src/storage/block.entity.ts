import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Storage } from './storage.entity';

// 块系统 - Notion 的核心架构
@Entity('blocks')
export class Block {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  // 关联的文件/页面
  @Column()
  storageId: string;

  @ManyToOne(() => Storage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storageId' })
  storage: Storage;

  // 块类型
  @Column()
  type: 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'bulleted_list' | 'numbered_list' | 
        'quote' | 'code' | 'divider' | 'image' | 'video' | 'audio' | 'file' | 'embed' | 
        'bookmark' | 'callout' | 'toggle' | 'database' | 'table' | 'equation' | 'breadcrumb';

  // 块内容 (根据type不同而不同)
  @Column('text', { nullable: true })
  content: string;

  // 块属性 (颜色、样式、链接等)
  @Column('jsonb', { nullable: true })
  properties: {
    // 通用属性
    color?: string;
    backgroundColor?: string;
    
    // 文本属性
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
    
    // 标题属性
    level?: number; // 1-3
    
    // 列表属性
    checked?: boolean; // for todo items
    
    // 媒体属性
    url?: string;
    caption?: string;
    width?: number;
    height?: number;
    
    // 数据库属性
    databaseId?: string;
    
    // Callout 属性
    icon?: string;
    
    // 链接属性
    link?: string;
    
    // 其他自定义属性
    [key: string]: any;
  };

  // 父块ID (用于嵌套结构)
  @Column({ nullable: true })
  parentId: string;

  @ManyToOne(() => Block, block => block.children, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent: Block;

  @OneToMany(() => Block, block => block.parent)
  children: Block[];

  // 在父块中的顺序
  @Column({ default: 0 })
  order: number;

  // 块的层级深度
  @Column({ default: 0 })
  depth: number;

  // 是否被删除 (软删除)
  @Column({ default: false })
  isDeleted: boolean;

  // 版本控制
  @Column({ default: 1 })
  version: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 