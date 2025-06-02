import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientService } from '../../common/http/http-client.service';

export interface ProcessingOptions {
  fileId: string;
  knowledgebaseId: string;
  filePath: string;
  userId: string;
  processingConfig?: {
    chunkSize?: number;
    chunkOverlap?: number;
    enableOCR?: boolean;
    extractKeywords?: boolean;
    codeLanguage?: string;
  };
}

export interface SearchQuery {
  query: string;
  knowledgebaseIds: string[];
  userId: string;
  limit?: number;
  filters?: {
    fileTypes?: string[];
    dateRange?: {
      start: string;
      end: string;
    };
    relevanceThreshold?: number;
  };
}

export interface SearchResult {
  id: string;
  content: string;
  title?: string;
  metadata: any;
  relevanceScore: number;
  fileId: string;
  knowledgebaseId: string;
}

export interface ProcessingResult {
  fileId: string;
  status: 'completed' | 'failed' | 'processing';
  chunksCount?: number;
  processedAt?: string;
  error?: string;
  metadata?: any;
}

@Injectable()
export class DocumentServiceClientV2 implements OnModuleInit {
  private readonly logger = new Logger(DocumentServiceClientV2.name);
  private readonly CLIENT_NAME = 'document-service';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClientService,
  ) {}

  onModuleInit() {
    // 初始化HTTP客户端
    const baseURL = this.configService.get<string>('DOCUMENT_SERVICE_URL', 'http://localhost:8000');
    const authToken = this.configService.get<string>('DOCUMENT_SERVICE_TOKEN');
    
    this.httpClient.createClient(this.CLIENT_NAME, {
      baseURL,
      timeout: 30000,
      authToken,
    });

    this.logger.log(`Document service client initialized: ${baseURL}`);
  }

  /**
   * 同步知识库信息到文档服务
   */
  async syncKnowledgebase(action: 'created' | 'updated' | 'deleted', knowledgebase: any): Promise<void> {
    try {
      await this.httpClient.request(this.CLIENT_NAME, {
        method: 'POST',
        url: '/api/v1/sync/knowledgebase',
        data: {
          action,
          data: {
            id: knowledgebase.id,
            userId: knowledgebase.userId,
            name: knowledgebase.name,
            description: knowledgebase.description,
            processingConfig: knowledgebase.processingConfig,
          },
        },
      });
      
      this.logger.log(`Knowledgebase ${action}: ${knowledgebase.id}`);
    } catch (error) {
      this.logger.error(`Failed to sync knowledgebase ${knowledgebase.id}:`, error.message);
      throw error;
    }
  }

  /**
   * 提交文档处理任务
   */
  async processDocument(options: ProcessingOptions): Promise<{ taskId: string }> {
    try {
      const result = await this.httpClient.request<{ taskId: string }>(this.CLIENT_NAME, {
        method: 'POST',
        url: '/api/v1/documents/process',
        data: options,
      });
      
      this.logger.log(`Document processing started: ${options.fileId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to process document ${options.fileId}:`, error.message);
      throw error;
    }
  }

  /**
   * 查询文档处理状态
   */
  async getProcessingStatus(fileId: string): Promise<ProcessingResult> {
    try {
      const result = await this.httpClient.request<ProcessingResult>(this.CLIENT_NAME, {
        method: 'GET',
        url: `/api/v1/documents/${fileId}/status`,
      });
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to get processing status for ${fileId}:`, error.message);
      throw error;
    }
  }

  /**
   * 语义搜索文档
   */
  async searchDocuments(query: SearchQuery): Promise<{
    results: SearchResult[];
    total: number;
    searchTime: number;
  }> {
    try {
      const result = await this.httpClient.request<{
        results: SearchResult[];
        total: number;
        searchTime: number;
      }>(this.CLIENT_NAME, {
        method: 'POST',
        url: '/api/v1/search/semantic',
        data: query,
      });
      
      this.logger.log(`Document search completed: ${query.query}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to search documents:`, error.message);
      throw error;
    }
  }

  /**
   * 混合搜索文档
   */
  async hybridSearch(query: SearchQuery): Promise<{
    results: SearchResult[];
    total: number;
    searchTime: number;
  }> {
    try {
      const result = await this.httpClient.request<{
        results: SearchResult[];
        total: number;
        searchTime: number;
      }>(this.CLIENT_NAME, {
        method: 'POST',
        url: '/api/v1/search/hybrid',
        data: query,
      });
      
      this.logger.log(`Hybrid search completed: ${query.query}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to perform hybrid search:`, error.message);
      throw error;
    }
  }

  /**
   * 获取知识库统计信息
   */
  async getKnowledgebaseStats(knowledgebaseId: string): Promise<{
    totalChunks: number;
    totalFiles: number;
    lastProcessed: string;
    processingStatus: any;
  }> {
    try {
      const result = await this.httpClient.request<{
        totalChunks: number;
        totalFiles: number;
        lastProcessed: string;
        processingStatus: any;
      }>(this.CLIENT_NAME, {
        method: 'GET',
        url: `/api/v1/knowledgebase/${knowledgebaseId}/stats`,
      });
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to get knowledgebase stats for ${knowledgebaseId}:`, error.message);
      throw error;
    }
  }

  /**
   * 重新处理知识库中的所有文档
   */
  async reprocessKnowledgebase(knowledgebaseId: string, options?: any): Promise<{ taskId: string }> {
    try {
      const result = await this.httpClient.request<{ taskId: string }>(this.CLIENT_NAME, {
        method: 'POST',
        url: `/api/v1/knowledgebase/${knowledgebaseId}/reprocess`,
        data: options || {},
      });
      
      this.logger.log(`Knowledgebase reprocessing started: ${knowledgebaseId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to reprocess knowledgebase ${knowledgebaseId}:`, error.message);
      throw error;
    }
  }

  /**
   * 删除文档相关数据
   */
  async deleteDocument(fileId: string): Promise<void> {
    try {
      await this.httpClient.request(this.CLIENT_NAME, {
        method: 'DELETE',
        url: `/api/v1/documents/${fileId}`,
      });
      
      this.logger.log(`Document deleted: ${fileId}`);
    } catch (error) {
      this.logger.error(`Failed to delete document ${fileId}:`, error.message);
      throw error;
    }
  }

  /**
   * 批量处理文档
   */
  async batchProcessDocuments(requests: ProcessingOptions[]): Promise<{ taskId: string; results: any[] }> {
    try {
      const result = await this.httpClient.request<{ taskId: string; results: any[] }>(this.CLIENT_NAME, {
        method: 'POST',
        url: '/api/v1/documents/batch-process',
        data: { requests },
      });
      
      this.logger.log(`Batch processing started for ${requests.length} documents`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to batch process documents:`, error.message);
      throw error;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.httpClient.request<{ status: string }>(this.CLIENT_NAME, {
        method: 'GET',
        url: '/health',
      });
      
      return result.status === 'healthy';
    } catch (error) {
      this.logger.warn('Document service health check failed:', error.message);
      return false;
    }
  }

  /**
   * 获取服务指标
   */
  async getServiceMetrics(): Promise<{
    uptime: number;
    requestCount: number;
    errorRate: number;
    avgResponseTime: number;
  }> {
    try {
      const result = await this.httpClient.request<{
        uptime: number;
        requestCount: number;
        errorRate: number;
        avgResponseTime: number;
      }>(this.CLIENT_NAME, {
        method: 'GET',
        url: '/api/v1/metrics',
      });
      
      return result;
    } catch (error) {
      this.logger.error('Failed to get service metrics:', error.message);
      throw error;
    }
  }
} 