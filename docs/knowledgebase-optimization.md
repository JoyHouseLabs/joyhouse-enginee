# 知识库系统优化设计文档

## 当前设计评估

### 现有优势
1. **基础架构完整**：已有知识库和文件管理的基本功能
2. **文件上传支持**：支持文件上传和存储
3. **用户隔离**：按用户ID进行数据隔离
4. **嵌入向量支持**：已预留 embedding 和 embeddingModel 字段

### 关键问题分析

#### 1. **缺乏语义搜索能力**
- 当前只有基础的文件存储，没有文档内容的向量化和语义搜索
- 无法根据用户问题智能检索相关知识片段
- 对于 Solana 编程手册这类技术文档，无法精确定位相关代码规范

#### 2. **文档处理能力不足**
- 缺乏文档解析和分块（chunking）功能
- 没有针对不同文件类型的专门处理逻辑
- 无法提取和索引文档的结构化信息

#### 3. **与 Agent 集成不够深入**
- 缺乏 Agent 调用知识库的标准接口
- 没有上下文感知的知识检索
- 缺乏基于角色卡片的知识库权限控制

#### 4. **版本管理和更新机制缺失**
- 技术文档（如 Solana 手册）需要版本管理
- 缺乏增量更新和差异检测
- 没有知识过期和更新提醒机制

## 优化方案设计

### 1. 实体结构优化

#### 扩展 Knowledgebase 实体
```typescript
@Entity('knowledgebase')
export class Knowledgebase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: ['document', 'code', 'api', 'manual', 'faq'] })
  type: string; // 知识库类型

  @Column({ type: 'json', nullable: true })
  metadata?: {
    language?: string; // 编程语言（如 'solana', 'rust', 'javascript'）
    version?: string; // 版本号
    lastUpdated?: Date; // 最后更新时间
    source?: string; // 来源（官方文档、社区等）
    tags?: string[]; // 标签
  };

  @Column({ type: 'json', nullable: true })
  processingConfig?: {
    chunkSize: number; // 分块大小
    chunkOverlap: number; // 重叠大小
    embeddingModel: string; // 嵌入模型
    enableCodeParsing: boolean; // 是否启用代码解析
    enableStructureExtraction: boolean; // 是否提取文档结构
  };

  @Column({ type: 'json', nullable: true })
  accessControl?: {
    isPublic: boolean; // 是否公开
    allowedRoles?: string[]; // 允许访问的角色
    allowedUsers?: string[]; // 允许访问的用户
  };

  @Column({ default: 'active' })
  status: 'active' | 'processing' | 'error' | 'archived';

  @ManyToOne(() => User)
  user: User;

  @OneToMany(() => KnowledgeChunk, chunk => chunk.knowledgebase)
  chunks: KnowledgeChunk[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

#### 新增 KnowledgeChunk 实体
```typescript
@Entity('knowledge_chunk')
export class KnowledgeChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  knowledgebaseId: string;

  @Column()
  fileId: string;

  @Column({ type: 'text' })
  content: string; // 文本内容

  @Column({ type: 'text', nullable: true })
  title?: string; // 标题或摘要

  @Column({ type: 'json', nullable: true })
  metadata?: {
    pageNumber?: number;
    section?: string;
    codeLanguage?: string;
    functionName?: string;
    className?: string;
    importance?: number; // 重要性评分
  };

  @Column({ type: 'vector', nullable: true })
  embedding?: number[]; // 向量嵌入

  @Column({ type: 'json', nullable: true })
  keywords?: string[]; // 关键词

  @Column({ default: 0 })
  accessCount: number; // 访问次数

  @Column({ type: 'float', default: 0 })
  relevanceScore: number; // 相关性评分

  @ManyToOne(() => Knowledgebase, kb => kb.chunks)
  knowledgebase: Knowledgebase;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

#### 扩展 Knowledgefile 实体
```typescript
@Entity('knowledgefile')
export class Knowledgefile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  knowledgebaseId: string;

  @Column()
  filename: string;

  @Column()
  filepath: string;

  @Column({ type: 'bigint' })
  filesize: number;

  @Column()
  url: string;

  @Column({ type: 'enum', enum: ['pdf', 'docx', 'txt', 'md', 'html', 'code'] })
  fileType: string;

  @Column({ type: 'json', nullable: true })
  processingResult?: {
    totalChunks: number;
    processingTime: number;
    extractedMetadata: any;
    errors?: string[];
  };

  @Column({ type: 'json', nullable: true })
  contentMetadata?: {
    wordCount?: number;
    codeBlocks?: number;
    images?: number;
    tables?: number;
    language?: string;
  };

  @Column({ default: 'pending' })
  status: 'pending' | 'processing' | 'completed' | 'error';

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @ManyToOne(() => User)
  user: User;

  @OneToMany(() => KnowledgeChunk, chunk => chunk.fileId)
  chunks: KnowledgeChunk[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 2. 核心服务扩展

#### 文档处理服务
```typescript
@Injectable()
export class DocumentProcessingService {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly chunkService: KnowledgeChunkService,
  ) {}

  async processDocument(file: Knowledgefile): Promise<void> {
    try {
      // 1. 提取文档内容
      const content = await this.extractContent(file);
      
      // 2. 文档分块
      const chunks = await this.chunkDocument(content, file);
      
      // 3. 生成嵌入向量
      const chunksWithEmbeddings = await this.generateEmbeddings(chunks);
      
      // 4. 保存到数据库
      await this.chunkService.saveChunks(chunksWithEmbeddings);
      
      // 5. 更新文件状态
      await this.updateFileStatus(file.id, 'completed');
    } catch (error) {
      await this.updateFileStatus(file.id, 'error', error.message);
    }
  }

  private async extractContent(file: Knowledgefile): Promise<string> {
    switch (file.fileType) {
      case 'pdf':
        return this.extractPdfContent(file.filepath);
      case 'docx':
        return this.extractDocxContent(file.filepath);
      case 'md':
        return this.extractMarkdownContent(file.filepath);
      case 'code':
        return this.extractCodeContent(file.filepath);
      default:
        return fs.readFileSync(file.filepath, 'utf-8');
    }
  }

  private async chunkDocument(content: string, file: Knowledgefile): Promise<KnowledgeChunk[]> {
    // 根据文件类型和配置进行智能分块
    const config = await this.getProcessingConfig(file.knowledgebaseId);
    
    if (file.fileType === 'code') {
      return this.chunkCodeDocument(content, config);
    } else {
      return this.chunkTextDocument(content, config);
    }
  }

  private async chunkCodeDocument(content: string, config: any): Promise<KnowledgeChunk[]> {
    // 按函数、类、模块等代码结构进行分块
    // 特别针对 Solana 程序的结构进行优化
    const chunks = [];
    
    // 解析代码结构
    const codeStructure = this.parseCodeStructure(content);
    
    for (const item of codeStructure) {
      chunks.push({
        content: item.code,
        title: item.name,
        metadata: {
          codeLanguage: item.language,
          functionName: item.functionName,
          className: item.className,
          importance: item.importance,
        },
      });
    }
    
    return chunks;
  }
}
```

#### 语义搜索服务
```typescript
@Injectable()
export class SemanticSearchService {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly chunkService: KnowledgeChunkService,
  ) {}

  async searchKnowledge(
    query: string,
    knowledgebaseIds: string[],
    options: {
      limit?: number;
      threshold?: number;
      filters?: {
        codeLanguage?: string;
        fileType?: string;
        importance?: number;
      };
    } = {}
  ): Promise<KnowledgeSearchResult[]> {
    // 1. 生成查询向量
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);
    
    // 2. 向量相似度搜索
    const similarChunks = await this.chunkService.findSimilarChunks(
      queryEmbedding,
      knowledgebaseIds,
      options
    );
    
    // 3. 重排序和过滤
    const rankedResults = await this.rankResults(query, similarChunks);
    
    return rankedResults.slice(0, options.limit || 10);
  }

  async searchForAgent(
    query: string,
    roleCard: RoleCard,
    context?: string
  ): Promise<AgentKnowledgeResult> {
    // 根据角色卡片配置的知识库进行搜索
    const knowledgebaseIds = roleCard.enabledKnowledgeBases || [];
    
    if (knowledgebaseIds.length === 0) {
      return { chunks: [], summary: null };
    }

    // 构建增强查询（结合上下文和角色信息）
    const enhancedQuery = this.buildEnhancedQuery(query, roleCard, context);
    
    // 执行搜索
    const results = await this.searchKnowledge(enhancedQuery, knowledgebaseIds, {
      limit: 5,
      threshold: 0.7,
      filters: this.buildFiltersFromRole(roleCard),
    });

    // 生成摘要
    const summary = await this.generateKnowledgeSummary(results, query);

    return {
      chunks: results,
      summary,
      sources: results.map(r => r.source),
    };
  }

  private buildEnhancedQuery(query: string, roleCard: RoleCard, context?: string): string {
    let enhancedQuery = query;
    
    // 添加角色相关的上下文
    if (roleCard.name.includes('开发')) {
      enhancedQuery += ' 代码 编程 开发';
    }
    
    // 添加对话上下文
    if (context) {
      enhancedQuery += ` 上下文: ${context.slice(-200)}`;
    }
    
    return enhancedQuery;
  }
}
```

### 3. Agent 集成接口

#### 知识库查询接口
```typescript
@Controller('knowledgebase')
export class KnowledgebaseController {
  // ... 现有方法

  @Post('search')
  @ApiOperation({ summary: '语义搜索知识库' })
  @ApiResponse({ type: [KnowledgeSearchResult] })
  async searchKnowledge(
    @Body() searchDto: KnowledgeSearchDto,
    @UserDecorator() user: User,
  ) {
    return this.semanticSearchService.searchKnowledge(
      searchDto.query,
      searchDto.knowledgebaseIds,
      searchDto.options
    );
  }

  @Post('search-for-agent')
  @ApiOperation({ summary: 'Agent 专用知识库搜索' })
  @ApiResponse({ type: AgentKnowledgeResult })
  async searchForAgent(
    @Body() searchDto: AgentKnowledgeSearchDto,
    @UserDecorator() user: User,
  ) {
    const roleCard = await this.roleCardService.findOne(searchDto.roleCardId, user);
    return this.semanticSearchService.searchForAgent(
      searchDto.query,
      roleCard,
      searchDto.context
    );
  }

  @Get(':id/chunks')
  @ApiOperation({ summary: '获取知识库的所有知识块' })
  @ApiResponse({ type: [KnowledgeChunk] })
  async getKnowledgeChunks(
    @Param('id') id: string,
    @Query() query: ChunkQueryDto,
    @UserDecorator() user: User,
  ) {
    return this.chunkService.findByKnowledgebase(id, query);
  }

  @Post(':id/reprocess')
  @ApiOperation({ summary: '重新处理知识库文档' })
  async reprocessKnowledgebase(
    @Param('id') id: string,
    @UserDecorator() user: User,
  ) {
    return this.documentProcessingService.reprocessKnowledgebase(id);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: '获取知识库统计信息' })
  async getKnowledgebaseStats(
    @Param('id') id: string,
    @UserDecorator() user: User,
  ) {
    return this.knowledgebaseService.getStatistics(id);
  }
}
```

### 4. Solana 编程手册专用优化

#### Solana 知识库模板
```typescript
export const SolanaKnowledgebaseTemplate = {
  name: 'Solana 编程手册',
  type: 'manual',
  metadata: {
    language: 'solana',
    version: '1.18.0',
    source: 'official',
    tags: ['blockchain', 'smart-contract', 'rust', 'web3'],
  },
  processingConfig: {
    chunkSize: 1000,
    chunkOverlap: 200,
    embeddingModel: 'text-embedding-3-small',
    enableCodeParsing: true,
    enableStructureExtraction: true,
  },
  accessControl: {
    isPublic: false,
    allowedRoles: ['developer', 'architect'],
  },
};
```

#### Solana 代码解析器
```typescript
@Injectable()
export class SolanaCodeParser {
  parseProgram(code: string): SolanaCodeStructure {
    return {
      instructions: this.extractInstructions(code),
      accounts: this.extractAccounts(code),
      errors: this.extractErrors(code),
      tests: this.extractTests(code),
      dependencies: this.extractDependencies(code),
    };
  }

  private extractInstructions(code: string): Instruction[] {
    // 解析 Solana 指令定义
    const instructionRegex = /pub fn (\w+)\s*\([^)]*\)\s*->\s*ProgramResult/g;
    const instructions = [];
    let match;

    while ((match = instructionRegex.exec(code)) !== null) {
      instructions.push({
        name: match[1],
        code: this.extractFunctionBody(code, match.index),
        parameters: this.extractParameters(match[0]),
        description: this.extractDocComment(code, match.index),
      });
    }

    return instructions;
  }

  private extractAccounts(code: string): Account[] {
    // 解析账户结构定义
    const accountRegex = /#\[derive\(Accounts\)\]\s*pub struct (\w+)/g;
    // ... 实现账户解析逻辑
  }
}
```

### 5. 必须新增的接口

#### 1. 批量文档处理接口
```typescript
@Post('batch-upload')
@ApiOperation({ summary: '批量上传并处理文档' })
async batchUpload(
  @UploadedFiles() files: Express.Multer.File[],
  @Body() batchDto: BatchUploadDto,
  @UserDecorator() user: User,
) {
  return this.documentProcessingService.batchProcess(files, batchDto, user);
}
```

#### 2. 知识库同步接口
```typescript
@Post(':id/sync')
@ApiOperation({ summary: '同步外部知识源' })
async syncKnowledgebase(
  @Param('id') id: string,
  @Body() syncDto: KnowledgeSyncDto,
  @UserDecorator() user: User,
) {
  return this.knowledgebaseService.syncFromSource(id, syncDto);
}
```

#### 3. 智能问答接口
```typescript
@Post('qa')
@ApiOperation({ summary: '基于知识库的智能问答' })
async askQuestion(
  @Body() qaDto: KnowledgeQADto,
  @UserDecorator() user: User,
) {
  return this.qaService.answerQuestion(qaDto);
}
```

#### 4. 知识图谱接口
```typescript
@Get(':id/knowledge-graph')
@ApiOperation({ summary: '获取知识图谱' })
async getKnowledgeGraph(
  @Param('id') id: string,
  @UserDecorator() user: User,
) {
  return this.knowledgeGraphService.buildGraph(id);
}
```

### 6. 数据库迁移

```sql
-- 扩展知识库表
ALTER TABLE knowledgebase 
ADD COLUMN type VARCHAR(50) DEFAULT 'document',
ADD COLUMN metadata JSON,
ADD COLUMN processing_config JSON,
ADD COLUMN access_control JSON,
ADD COLUMN status VARCHAR(20) DEFAULT 'active';

-- 创建知识块表
CREATE TABLE knowledge_chunk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledgebase_id UUID REFERENCES knowledgebase(id) ON DELETE CASCADE,
  file_id UUID REFERENCES knowledgefile(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  title VARCHAR(500),
  metadata JSON,
  embedding VECTOR(1536), -- 根据嵌入模型维度调整
  keywords JSON,
  access_count INTEGER DEFAULT 0,
  relevance_score FLOAT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建向量索引
CREATE INDEX idx_knowledge_chunk_embedding ON knowledge_chunk USING ivfflat (embedding vector_cosine_ops);

-- 扩展文件表
ALTER TABLE knowledgefile 
ADD COLUMN file_type VARCHAR(20),
ADD COLUMN processing_result JSON,
ADD COLUMN content_metadata JSON,
ADD COLUMN error_message TEXT;
```

## 实施建议

### 阶段一：基础优化（1-2周）
1. 扩展实体结构
2. 实现基础文档处理
3. 添加语义搜索功能

### 阶段二：Agent 集成（2-3周）
1. 实现 Agent 专用搜索接口
2. 集成角色卡片权限控制
3. 优化搜索结果排序

### 阶段三：专业化支持（2-4周）
1. 实现 Solana 代码解析器
2. 添加版本管理功能
3. 实现知识图谱构建

### 阶段四：高级功能（3-4周）
1. 智能问答系统
2. 自动更新机制
3. 性能优化和监控

## 总结

通过这些优化，知识库系统将能够：

1. **智能理解**：深度解析 Solana 编程手册等技术文档
2. **精准检索**：基于语义搜索快速定位相关代码规范
3. **角色适配**：根据 Agent 角色提供定制化的知识服务
4. **持续更新**：自动跟踪和更新最新的技术规范
5. **上下文感知**：结合对话上下文提供更准确的知识支持

这将使 Agent 能够基于最新的 Solana 语法规范生成准确的代码，大大提升开发效率和代码质量。 