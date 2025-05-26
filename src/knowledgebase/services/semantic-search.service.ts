import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeChunk } from '../entities/knowledge-chunk.entity';

export interface KnowledgeSearchResult {
  id: string;
  content: string;
  title?: string;
  metadata?: any;
  relevanceScore: number;
  source: {
    knowledgebaseId: string;
    fileId: string;
    filename?: string;
  };
}

export interface AgentKnowledgeResult {
  chunks: KnowledgeSearchResult[];
  summary: string | null;
  sources: string[];
}

export interface SearchOptions {
  limit?: number;
  threshold?: number;
  filters?: {
    codeLanguage?: string;
    fileType?: string;
    importance?: number;
  };
}

@Injectable()
export class SemanticSearchService {
  constructor(
    @InjectRepository(KnowledgeChunk)
    private readonly chunkRepo: Repository<KnowledgeChunk>,
  ) {}

  async searchKnowledge(
    query: string,
    knowledgebaseIds: string[],
    options: SearchOptions = {}
  ): Promise<KnowledgeSearchResult[]> {
    const { limit = 10, threshold = 0.5, filters = {} } = options;

    // 构建查询
    const queryBuilder = this.chunkRepo
      .createQueryBuilder('chunk')
      .leftJoinAndSelect('chunk.file', 'file')
      .where('chunk.knowledgebaseId IN (:...knowledgebaseIds)', { knowledgebaseIds });

    // 添加过滤条件
    if (filters.codeLanguage) {
      queryBuilder.andWhere("chunk.metadata->>'codeLanguage' = :codeLanguage", {
        codeLanguage: filters.codeLanguage,
      });
    }

    if (filters.importance) {
      queryBuilder.andWhere("(chunk.metadata->>'importance')::int >= :importance", {
        importance: filters.importance,
      });
    }

    // 文本搜索（简化版，实际应该使用向量搜索）
    if (query) {
      queryBuilder.andWhere(
        '(chunk.content ILIKE :query OR chunk.title ILIKE :query OR chunk.keywords::text ILIKE :query)',
        { query: `%${query}%` }
      );
    }

    // 按相关性排序
    queryBuilder
      .orderBy('chunk.relevanceScore', 'DESC')
      .addOrderBy('chunk.accessCount', 'DESC')
      .limit(limit);

    const chunks = await queryBuilder.getMany();

    return chunks.map(chunk => ({
      id: chunk.id,
      content: chunk.content,
      title: chunk.title,
      metadata: chunk.metadata,
      relevanceScore: chunk.relevanceScore,
      source: {
        knowledgebaseId: chunk.knowledgebaseId,
        fileId: chunk.fileId,
        filename: chunk.file?.filename,
      },
    }));
  }

  async searchForAgent(
    query: string,
    enabledKnowledgeBases: string[],
    context?: string
  ): Promise<AgentKnowledgeResult> {
    if (enabledKnowledgeBases.length === 0) {
      return { chunks: [], summary: null, sources: [] };
    }

    // 构建增强查询（结合上下文）
    const enhancedQuery = this.buildEnhancedQuery(query, context);

    // 执行搜索
    const results = await this.searchKnowledge(enhancedQuery, enabledKnowledgeBases, {
      limit: 5,
      threshold: 0.7,
    });

    // 生成摘要（简化版）
    const summary = this.generateKnowledgeSummary(results, query);

    return {
      chunks: results,
      summary,
      sources: results.map(r => r.source.filename || r.source.fileId),
    };
  }

  async findSimilarChunks(
    chunkId: string,
    limit: number = 5
  ): Promise<KnowledgeSearchResult[]> {
    const chunk = await this.chunkRepo.findOne({
      where: { id: chunkId },
      relations: ['file'],
    });

    if (!chunk) {
      return [];
    }

    // 基于关键词和元数据查找相似内容
    const queryBuilder = this.chunkRepo
      .createQueryBuilder('chunk')
      .leftJoinAndSelect('chunk.file', 'file')
      .where('chunk.id != :chunkId', { chunkId })
      .andWhere('chunk.knowledgebaseId = :knowledgebaseId', {
        knowledgebaseId: chunk.knowledgebaseId,
      });

    // 如果有关键词，基于关键词查找
    if (chunk.keywords && chunk.keywords.length > 0) {
      queryBuilder.andWhere('chunk.keywords && :keywords', {
        keywords: chunk.keywords,
      });
    }

    // 如果有代码语言，优先匹配相同语言
    if (chunk.metadata?.codeLanguage) {
      queryBuilder.andWhere("chunk.metadata->>'codeLanguage' = :codeLanguage", {
        codeLanguage: chunk.metadata.codeLanguage,
      });
    }

    const similarChunks = await queryBuilder
      .orderBy('chunk.relevanceScore', 'DESC')
      .limit(limit)
      .getMany();

    return similarChunks.map(similarChunk => ({
      id: similarChunk.id,
      content: similarChunk.content,
      title: similarChunk.title,
      metadata: similarChunk.metadata,
      relevanceScore: similarChunk.relevanceScore,
      source: {
        knowledgebaseId: similarChunk.knowledgebaseId,
        fileId: similarChunk.fileId,
        filename: similarChunk.file?.filename,
      },
    }));
  }

  async updateChunkRelevance(chunkId: string, score: number): Promise<void> {
    await this.chunkRepo.update(chunkId, { relevanceScore: score });
  }

  async incrementAccessCount(chunkId: string): Promise<void> {
    await this.chunkRepo.increment({ id: chunkId }, 'accessCount', 1);
  }

  private buildEnhancedQuery(query: string, context?: string): string {
    let enhancedQuery = query;

    // 添加对话上下文
    if (context) {
      enhancedQuery += ` 上下文: ${context.slice(-200)}`;
    }

    return enhancedQuery;
  }

  private generateKnowledgeSummary(results: KnowledgeSearchResult[], query: string): string {
    if (results.length === 0) {
      return '未找到相关知识。';
    }

    const sources = [...new Set(results.map(r => r.source.filename).filter(Boolean))];
    const sourceText = sources.length > 0 ? `来源：${sources.join(', ')}` : '';

    return `找到 ${results.length} 条相关知识。${sourceText}`;
  }
} 