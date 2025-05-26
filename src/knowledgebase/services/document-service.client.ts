import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';

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
export class DocumentServiceClient {
  private readonly logger = new Logger(DocumentServiceClient.name);
  private readonly baseUrl: string;

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('DOCUMENT_SERVICE_URL', 'http://localhost:8000');
  }

  /**
   * 同步知识库信息到文档服务
   */
  async syncKnowledgebase(action: 'created' | 'updated' | 'deleted', knowledgebase: any): Promise<void> {
    try {
      const url = `${this.baseUrl}/api/v1/sync/knowledgebase`;
      await axios.post(url, {
        action,
        data: {
          id: knowledgebase.id,
          userId: knowledgebase.userId,
          name: knowledgebase.name,
          description: knowledgebase.description,
          processingConfig: knowledgebase.processingConfig,
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
      const url = `${this.baseUrl}/api/v1/documents/process`;
      const response: AxiosResponse = await axios.post(url, options);
      
      this.logger.log(`Document processing started: ${options.fileId}`);
      return response.data;
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
      const url = `${this.baseUrl}/api/v1/documents/${fileId}/status`;
      const response: AxiosResponse = await axios.get(url);
      
      return response.data;
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
      const url = `${this.baseUrl}/api/v1/search/semantic`;
      const response: AxiosResponse = await axios.post(url, query);
      
      this.logger.log(`Document search completed: ${query.query}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to search documents:`, error.message);
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
      const url = `${this.baseUrl}/api/v1/knowledgebase/${knowledgebaseId}/stats`;
      const response: AxiosResponse = await axios.get(url);
      
      return response.data;
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
      const url = `${this.baseUrl}/api/v1/knowledgebase/${knowledgebaseId}/reprocess`;
      const response: AxiosResponse = await axios.post(url, options || {});
      
      this.logger.log(`Knowledgebase reprocessing started: ${knowledgebaseId}`);
      return response.data;
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
      const url = `${this.baseUrl}/api/v1/documents/${fileId}`;
      await axios.delete(url);
      
      this.logger.log(`Document deleted: ${fileId}`);
    } catch (error) {
      this.logger.error(`Failed to delete document ${fileId}:`, error.message);
      throw error;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/health`;
      const response: AxiosResponse = await axios.get(url);
      
      return response.data.status === 'healthy';
    } catch (error) {
      this.logger.warn('Document service health check failed:', error.message);
      return false;
    }
  }
} 