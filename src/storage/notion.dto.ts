import { IsOptional, IsString, IsBoolean, IsNumber, IsArray, IsEnum, IsObject } from 'class-validator';

// 创建页面DTO
export class CreatePageDto {
  @IsString()
  filename: string;

  @IsString()
  filepath: string;

  @IsEnum(['file', 'page', 'database', 'template'])
  type: 'file' | 'page' | 'database' | 'template';

  @IsOptional()
  @IsString()
  storage_dir_id?: string;

  @IsOptional()
  @IsObject()
  pageProperties?: {
    coverUrl?: string;
    icon?: string;
    title?: string;
    description?: string;
    category?: string;
    templateId?: string;
    defaultView?: 'page' | 'table' | 'board' | 'calendar' | 'gallery' | 'timeline';
    customProperties?: Record<string, any>;
  };

  @IsOptional()
  @IsArray()
  tags?: string[];
}

// 创建块DTO
export class CreateBlockDto {
  @IsString()
  storageId: string;

  @IsEnum(['paragraph', 'heading1', 'heading2', 'heading3', 'bulleted_list', 'numbered_list', 
           'quote', 'code', 'divider', 'image', 'video', 'audio', 'file', 'embed', 
           'bookmark', 'callout', 'toggle', 'database', 'table', 'equation', 'breadcrumb'])
  type: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;
}

// 更新块DTO
export class UpdateBlockDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;
}

// 创建链接DTO
export class CreateLinkDto {
  @IsString()
  sourceId: string;

  @IsEnum(['block', 'file', 'dir', 'page'])
  sourceType: 'block' | 'file' | 'dir' | 'page';

  @IsString()
  targetId: string;

  @IsEnum(['block', 'file', 'dir', 'page'])
  targetType: 'block' | 'file' | 'dir' | 'page';

  @IsEnum(['mention', 'reference', 'embed', 'child', 'synonym'])
  relationType: 'mention' | 'reference' | 'embed' | 'child' | 'synonym';

  @IsOptional()
  @IsNumber()
  strength?: number;

  @IsOptional()
  @IsObject()
  context?: {
    excerpt?: string;
    position?: number;
    anchorText?: string;
    bidirectional?: boolean;
  };
}

// 搜索DTO
export class SearchDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsArray()
  types?: ('file' | 'page' | 'database' | 'template')[];

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  includeArchived?: boolean;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  offset?: number;
}

// 页面树结构DTO
export class PageTreeDto {
  id: string;
  filename: string;
  type: 'file' | 'page' | 'database' | 'template';
  icon?: string;
  children: PageTreeDto[];
  hasChildren: boolean;
  isArchived: boolean;
  isFavorite: boolean;
}

// 知识图谱响应DTO
export class KnowledgeGraphDto {
  nodes: Array<{
    id: string;
    type: 'block' | 'file' | 'dir' | 'page';
    title: string;
    category?: string;
    size: number; // 节点大小，基于连接数
  }>;
  
  edges: Array<{
    source: string;
    target: string;
    type: 'mention' | 'reference' | 'embed' | 'child' | 'synonym';
    strength: number;
  }>;
}

// 数据库查询DTO
export class DatabaseQueryDto {
  @IsString()
  databaseId: string;

  @IsOptional()
  @IsObject()
  filter?: Record<string, any>;

  @IsOptional()
  @IsArray()
  sorts?: Array<{
    property: string;
    direction: 'asc' | 'desc';
  }>;

  @IsOptional()
  @IsNumber()
  pageSize?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
} 