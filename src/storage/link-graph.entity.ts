import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// 全局链接系统 (Notion 的核心优势)
@Entity('link_graph')
export class LinkGraph {
  @PrimaryColumn()
  sourceId: string; // 来源块/文件ID

  @Column()
  sourceType: 'block' | 'file' | 'dir' | 'page';

  @PrimaryColumn()
  targetId: string; // 目标块/文件ID

  @Column()
  targetType: 'block' | 'file' | 'dir' | 'page';

  @Column()
  relationType: 'mention' | 'reference' | 'embed' | 'child' | 'synonym';

  // 链接强度 (基于引用频率和上下文相关性)
  @Column('float', { default: 1.0 })
  strength: number;

  // 自动生成知识图谱的上下文信息
  @Column('jsonb', { nullable: true })
  context: {
    excerpt?: string; // 上下文摘要
    position?: number; // 在内容中的位置
    anchorText?: string; // 链接锚文本
    bidirectional?: boolean; // 是否双向链接
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}