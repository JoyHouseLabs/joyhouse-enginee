# 知识库系统实施指南

## 概述

本文档详细说明了知识库系统的实施步骤，包括数据库迁移、服务配置和 API 使用方法。

## 数据库迁移

### 1. 扩展现有表结构

```sql
-- 扩展知识库表
ALTER TABLE knowledgebase 
ADD COLUMN type VARCHAR(50) DEFAULT 'document',
ADD COLUMN metadata JSON,
ADD COLUMN processing_config JSON,
ADD COLUMN access_control JSON,
ADD COLUMN status VARCHAR(20) DEFAULT 'active';

-- 扩展文件表
ALTER TABLE knowledgefile 
ADD COLUMN file_type VARCHAR(20),
ADD COLUMN processing_result JSON,
ADD COLUMN content_metadata JSON,
ADD COLUMN error_message TEXT;
```

### 2. 创建知识块表

```sql
-- 创建知识块表
CREATE TABLE knowledge_chunk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledgebase_id VARCHAR(26) REFERENCES knowledgebase(id) ON DELETE CASCADE,
  file_id VARCHAR(26) REFERENCES knowledgefile(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  title VARCHAR(500),
  metadata JSON,
  embedding FLOAT[1536], -- 根据嵌入模型维度调整
  keywords JSON,
  access_count INTEGER DEFAULT 0,
  relevance_score FLOAT DEFAULT 0,
  semantic_tags JSON,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_knowledge_chunk_knowledgebase ON knowledge_chunk(knowledgebase_id);
CREATE INDEX idx_knowledge_chunk_file ON knowledge_chunk(file_id);
CREATE INDEX idx_knowledge_chunk_relevance ON knowledge_chunk(knowledgebase_id, relevance_score DESC);

-- 如果使用 PostgreSQL 的 pgvector 扩展
-- CREATE INDEX idx_knowledge_chunk_embedding ON knowledge_chunk USING ivfflat (embedding vector_cosine_ops);
```

## 服务配置

### 1. 更新 TypeORM 配置

在 `knowledgebase.module.ts` 中添加新实体：

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Knowledgebase } from './knowledgebase.entity';
import { Knowledgefile } from './knowledgefile.entity';
import { KnowledgeChunk } from './entities/knowledge-chunk.entity';
import { KnowledgebaseService } from './knowledgebase.service';
import { KnowledgefileService } from './knowledgefile.service';
import { SemanticSearchService } from './services/semantic-search.service';
import { DocumentProcessingService } from './services/document-processing.service';
import { KnowledgebaseController } from './knowledgebase.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Knowledgebase,
      Knowledgefile,
      KnowledgeChunk,
    ]),
  ],
  controllers: [KnowledgebaseController],
  providers: [
    KnowledgebaseService,
    KnowledgefileService,
    SemanticSearchService,
    DocumentProcessingService,
  ],
  exports: [
    KnowledgebaseService,
    SemanticSearchService,
  ],
})
export class KnowledgebaseModule {}
```

### 2. 环境变量配置

在 `.env` 文件中添加：

```env
# 向量数据库配置
VECTOR_DB_TYPE=pinecone  # 或 weaviate, qdrant
VECTOR_DB_API_KEY=your_api_key
VECTOR_DB_ENVIRONMENT=your_environment
VECTOR_DB_INDEX_NAME=joyhouse-knowledge

# 嵌入模型配置
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536

# 文档处理配置
DEFAULT_CHUNK_SIZE=1000
DEFAULT_CHUNK_OVERLAP=200
MAX_FILE_SIZE=50MB
SUPPORTED_FILE_TYPES=pdf,docx,txt,md,html,rs,js,ts,py
```

## API 使用指南

### 1. 创建 Solana 知识库

```typescript
POST /knowledgebase/create
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Solana 编程手册",
  "description": "最新的 Solana 区块链开发文档和代码规范",
  "type": "manual",
  "metadata": {
    "language": "solana",
    "version": "1.18.0",
    "source": "official",
    "tags": ["blockchain", "smart-contract", "rust", "web3"]
  },
  "processingConfig": {
    "chunkSize": 1000,
    "chunkOverlap": 200,
    "embeddingModel": "text-embedding-3-small",
    "enableCodeParsing": true,
    "enableStructureExtraction": true
  },
  "accessControl": {
    "isPublic": false,
    "allowedRoles": ["developer", "architect"]
  }
}
```

### 2. 上传文档

```typescript
POST /knowledgebase/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

FormData:
- file: <Solana手册.pdf>
- knowledgebaseId: <知识库ID>
```

### 3. 语义搜索

```typescript
POST /knowledgebase/search
Content-Type: application/json
Authorization: Bearer <token>

{
  "query": "如何创建 Solana 程序的指令处理函数？",
  "knowledgebaseIds": ["<知识库ID>"],
  "options": {
    "limit": 5,
    "threshold": 0.7,
    "filters": {
      "codeLanguage": "rust",
      "importance": 3
    }
  }
}
```

### 4. Agent 专用搜索

```typescript
POST /knowledgebase/search-for-agent
Content-Type: application/json
Authorization: Bearer <token>

{
  "query": "程序账户的数据结构应该如何定义？",
  "roleCardId": "<角色卡片ID>",
  "context": "用户正在开发一个 NFT 市场的 Solana 程序"
}
```

### 5. 获取知识块

```typescript
GET /knowledgebase/<知识库ID>/chunks?page=1&pageSize=20&codeLanguage=rust
Authorization: Bearer <token>
```

### 6. 重新处理文档

```typescript
POST /knowledgebase/<知识库ID>/reprocess
Authorization: Bearer <token>
```

## 集成到 Agent 系统

### 1. 在角色卡片中配置知识库

```typescript
// 创建或更新角色卡片时
{
  "name": "Solana 开发专家",
  "systemPrompt": "你是一个专业的 Solana 区块链开发专家...",
  "enabledKnowledgeBases": ["<Solana知识库ID>"],
  "knowledgeSearchConfig": {
    "maxResults": 5,
    "relevanceThreshold": 0.7,
    "prioritizeCodeExamples": true
  }
}
```

### 2. Agent 对话中的知识库集成

当用户与 Agent 对话时，系统会：

1. 检查当前角色卡片的知识库配置
2. 基于用户问题进行语义搜索
3. 将相关知识作为上下文注入到 LLM 提示词中
4. 生成基于最新知识的回答

### 3. 示例对话流程

```
用户: "帮我写一个 Solana 程序的转账指令"

系统内部流程:
1. 检测到角色卡片配置了 Solana 知识库
2. 搜索相关知识: "Solana 转账指令 程序开发"
3. 找到相关代码示例和最佳实践
4. 构建增强提示词:
   "你是 Solana 开发专家。基于以下最新文档信息:
   [知识库搜索结果]
   请帮用户编写转账指令..."
5. 生成符合最新规范的代码

Agent: "基于最新的 Solana 1.18.0 规范，这里是一个转账指令的实现:
[生成的代码]
这个实现遵循了最新的安全最佳实践..."
```

## 性能优化建议

### 1. 向量索引优化

```sql
-- 使用适当的向量索引
CREATE INDEX CONCURRENTLY idx_knowledge_chunk_embedding 
ON knowledge_chunk USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
```

### 2. 缓存策略

```typescript
// 在 SemanticSearchService 中添加缓存
@Injectable()
export class SemanticSearchService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async searchKnowledge(query: string, options: SearchOptions) {
    const cacheKey = `search:${hash(query + JSON.stringify(options))}`;
    
    let results = await this.cacheManager.get(cacheKey);
    if (!results) {
      results = await this.performSearch(query, options);
      await this.cacheManager.set(cacheKey, results, 300); // 5分钟缓存
    }
    
    return results;
  }
}
```

### 3. 异步处理

```typescript
// 文档处理使用队列
@Injectable()
export class DocumentProcessingService {
  constructor(
    @InjectQueue('document-processing') private processingQueue: Queue,
  ) {}

  async processDocument(fileId: string) {
    await this.processingQueue.add('process-file', { fileId }, {
      attempts: 3,
      backoff: 'exponential',
    });
  }
}
```

## 监控和日志

### 1. 关键指标监控

- 文档处理成功率
- 搜索响应时间
- 向量相似度分布
- 知识库使用频率

### 2. 日志配置

```typescript
// 在各服务中添加详细日志
this.logger.log(`Processing document ${fileId}: ${chunks.length} chunks created`);
this.logger.warn(`Search returned low relevance results for query: ${query}`);
this.logger.error(`Document processing failed for ${fileId}:`, error);
```

## 故障排除

### 常见问题

1. **向量搜索性能差**
   - 检查向量索引是否正确创建
   - 调整搜索参数和阈值

2. **文档处理失败**
   - 检查文件格式支持
   - 验证文件大小限制

3. **搜索结果不准确**
   - 调整分块大小和重叠
   - 优化关键词提取算法

4. **内存使用过高**
   - 实施分批处理
   - 添加内存限制和清理机制

这个实施指南提供了完整的部署和使用流程，确保知识库系统能够有效支持 Agent 的智能对话功能。 