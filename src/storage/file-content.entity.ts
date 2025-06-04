import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Storage } from './storage.entity'

export enum ContentType {
  TEXT = 'text',
  IMAGE = 'image', 
  TABLE = 'table',
  METADATA = 'metadata',
  SLIDE = 'slide', // PPT幻灯片
  SHEET = 'sheet', // Excel工作表
}

export interface TableData {
  headers: string[]
  rows: string[][]
  caption?: string
}

export interface ImageData {
  path: string
  width?: number
  height?: number
  caption?: string
  alt?: string
}

export interface SlideData {
  title?: string
  content: string
  images?: ImageData[]
  slideNumber: number
}

export interface SheetData {
  sheetName: string
  tables: TableData[]
  charts?: any[] // 图表数据
}

@Entity('file_contents')
export class FileContent {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  fileId: string

  @ManyToOne(() => Storage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fileId' })
  file: Storage

  @Column({
    type: 'enum',
    enum: ContentType,
  })
  contentType: ContentType

  @Column('text')
  content: string // 主要文本内容

  @Column('json', { nullable: true })
  metadata: any // 结构化元数据：表格、图片信息等

  @Column({ nullable: true })
  pageNumber: number // 页码或位置信息

  @Column({ nullable: true })
  section: string // 章节或部分名称

  @Column('text', { nullable: true })
  rawContent: string // 原始提取内容（未清洗）

  @Column('json', { nullable: true })
  extractionConfig: any // 提取时的配置参数

  @CreateDateColumn()
  extractedAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @Column({ default: false })
  isProcessed: boolean // 是否已处理（用于向量化标记）

  @Column('text', { nullable: true })
  summary: string // AI生成的摘要

  @Column('json', { nullable: true })
  keywords: string[] // 提取的关键词

  @Column({ nullable: true })
  language: string // 检测到的语言

  @Column('float', { nullable: true })
  confidence: number // 提取置信度
} 