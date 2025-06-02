export interface ServiceConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  authToken?: string;
  healthCheckInterval: number;
  circuitBreaker: {
    enabled: boolean;
    errorThreshold: number;
    resetTimeout: number;
  };
}

export interface ServicesConfiguration {
  documentService: ServiceConfig;
  embeddingService?: ServiceConfig;
  searchService?: ServiceConfig;
}

export const getServicesConfig = (): ServicesConfiguration => {
  return {
    documentService: {
      baseUrl: process.env.DOCUMENT_SERVICE_URL || 'http://localhost:8000',
      timeout: parseInt(process.env.DOCUMENT_SERVICE_TIMEOUT || '30000'),
      retries: parseInt(process.env.DOCUMENT_SERVICE_RETRIES || '3'),
      authToken: process.env.DOCUMENT_SERVICE_TOKEN,
      healthCheckInterval: parseInt(process.env.DOCUMENT_SERVICE_HEALTH_CHECK_INTERVAL || '30000'),
      circuitBreaker: {
        enabled: process.env.DOCUMENT_SERVICE_CIRCUIT_BREAKER_ENABLED === 'true',
        errorThreshold: parseInt(process.env.DOCUMENT_SERVICE_ERROR_THRESHOLD || '50'),
        resetTimeout: parseInt(process.env.DOCUMENT_SERVICE_RESET_TIMEOUT || '30000'),
      },
    },
    embeddingService: {
      baseUrl: process.env.EMBEDDING_SERVICE_URL || 'http://localhost:8001',
      timeout: parseInt(process.env.EMBEDDING_SERVICE_TIMEOUT || '60000'),
      retries: parseInt(process.env.EMBEDDING_SERVICE_RETRIES || '2'),
      authToken: process.env.EMBEDDING_SERVICE_TOKEN,
      healthCheckInterval: parseInt(process.env.EMBEDDING_SERVICE_HEALTH_CHECK_INTERVAL || '60000'),
      circuitBreaker: {
        enabled: process.env.EMBEDDING_SERVICE_CIRCUIT_BREAKER_ENABLED === 'true',
        errorThreshold: parseInt(process.env.EMBEDDING_SERVICE_ERROR_THRESHOLD || '30'),
        resetTimeout: parseInt(process.env.EMBEDDING_SERVICE_RESET_TIMEOUT || '60000'),
      },
    },
    searchService: {
      baseUrl: process.env.SEARCH_SERVICE_URL || 'http://localhost:8002',
      timeout: parseInt(process.env.SEARCH_SERVICE_TIMEOUT || '15000'),
      retries: parseInt(process.env.SEARCH_SERVICE_RETRIES || '2'),
      authToken: process.env.SEARCH_SERVICE_TOKEN,
      healthCheckInterval: parseInt(process.env.SEARCH_SERVICE_HEALTH_CHECK_INTERVAL || '30000'),
      circuitBreaker: {
        enabled: process.env.SEARCH_SERVICE_CIRCUIT_BREAKER_ENABLED === 'true',
        errorThreshold: parseInt(process.env.SEARCH_SERVICE_ERROR_THRESHOLD || '40'),
        resetTimeout: parseInt(process.env.SEARCH_SERVICE_RESET_TIMEOUT || '30000'),
      },
    },
  };
};

// 服务发现配置
export interface ServiceDiscoveryConfig {
  enabled: boolean;
  consulUrl?: string;
  serviceName: string;
  healthCheckPath: string;
  tags: string[];
}

export const getServiceDiscoveryConfig = (): ServiceDiscoveryConfig => {
  return {
    enabled: process.env.SERVICE_DISCOVERY_ENABLED === 'true',
    consulUrl: process.env.CONSUL_URL,
    serviceName: process.env.SERVICE_NAME || 'joyhouse-engine',
    healthCheckPath: '/health',
    tags: (process.env.SERVICE_TAGS || 'api,knowledgebase').split(','),
  };
}; 