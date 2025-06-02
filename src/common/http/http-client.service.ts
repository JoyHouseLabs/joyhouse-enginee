import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosResponse, AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

// 扩展 Axios 配置类型以支持 metadata
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: {
      startTime: number;
    };
  }
}

export interface HttpClientOptions {
  baseURL: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  authToken?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

@Injectable()
export class HttpClientService {
  private readonly logger = new Logger(HttpClientService.name);
  private clients: Map<string, AxiosInstance> = new Map();

  constructor(private readonly configService: ConfigService) {}

  /**
   * 创建HTTP客户端
   */
  createClient(name: string, options: HttpClientOptions): AxiosInstance {
    if (this.clients.has(name)) {
      return this.clients.get(name)!;
    }

    const client = axios.create({
      baseURL: options.baseURL,
      timeout: options.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'JoyHouse-Engine/1.0',
      },
      maxRedirects: 3,
      validateStatus: (status) => status < 500,
    });

    // 请求拦截器
    client.interceptors.request.use(
      (config) => {
        // 添加认证头
        if (options.authToken) {
          config.headers.Authorization = `Bearer ${options.authToken}`;
        }

        // 添加请求ID
        config.headers['X-Request-ID'] = this.generateRequestId();
        config.metadata = { startTime: Date.now() };

        this.logger.debug(`[${name}] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 响应拦截器
    client.interceptors.response.use(
      (response) => {
        const duration = response.config.metadata?.startTime 
          ? Date.now() - response.config.metadata.startTime 
          : 0;
        this.logger.debug(`[${name}] ${response.status} ${response.config.url} (${duration}ms)`);
        return response;
      },
      (error: AxiosError) => {
        this.handleError(name, error);
        return Promise.reject(error);
      }
    );

    this.clients.set(name, client);
    return client;
  }

  /**
   * 执行带重试的请求
   */
  async request<T>(
    clientName: string,
    config: AxiosRequestConfig,
    retries: number = 3
  ): Promise<T> {
    const client = this.clients.get(clientName);
    if (!client) {
      throw new Error(`HTTP client '${clientName}' not found`);
    }

    let lastError: any;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await client.request<ApiResponse<T>>(config);
        
        // 检查API响应格式
        if (response.data && typeof response.data === 'object' && 'success' in response.data) {
          if (!response.data.success) {
            throw new Error(response.data.error || 'API request failed');
          }
          return response.data.data!;
        }

        return response.data as T;
      } catch (error) {
        lastError = error;

        if (!this.shouldRetry(error, attempt, retries)) {
          break;
        }

        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        this.logger.warn(`[${clientName}] Retry ${attempt}/${retries} in ${delay}ms`);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleError(clientName: string, error: AxiosError): void {
    const { response, config } = error;
    
    if (response) {
      this.logger.error(`[${clientName}] HTTP ${response.status}: ${config?.url}`, {
        status: response.status,
        data: response.data,
      });
    } else {
      this.logger.error(`[${clientName}] Network Error: ${config?.url}`, {
        message: error.message,
        code: error.code,
      });
    }
  }

  private shouldRetry(error: any, attempt: number, maxRetries: number): boolean {
    if (attempt >= maxRetries) return false;

    // 网络错误
    if (['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'].includes(error.code)) {
      return true;
    }

    // 服务器错误
    if (error.response && error.response.status >= 500) {
      return true;
    }

    // 限流
    if (error.response && error.response.status === 429) {
      return true;
    }

    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 