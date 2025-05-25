import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'joyhouse.yaml');

export interface LoggingConfig {
  dir: string;
  level: string;
  console: boolean;
  maxSize: number;
  maxFiles: number;
  dailyRotate: boolean;
}

export interface CorsConfig {
  origins: string | string[];
  credentials: boolean;
  methods: string;
}

export interface MonitoringConfig {
  enabled: boolean;
  websocket: {
    port: number;
    namespace: string;
    corsOrigin: string;
  };
  performance: {
    trackingEnabled: boolean;
    retentionHours: number;
    warningThresholdMs: number;
    criticalThresholdMs: number;
  };
  events: {
    enableNodeEvents: boolean;
    enableWorkflowEvents: boolean;
    enablePerformanceEvents: boolean;
  };
}

export interface JoyhouseConfig {
  uploadDir: string;
  domain: string;
  fileDomain?: string; // 新增，文件访问域名
  dbType: 'sqlite' | 'postgresql';
  dbHost?: string;
  dbPort?: number;
  dbUser?: string;
  dbPassword?: string;
  dbName?: string;
  httpsEnabled?: boolean; // 新增，控制是否启用 https
  logging?: LoggingConfig;
  cors?: CorsConfig;
  monitoring?: MonitoringConfig; // 新增监控配置
}

export class JoyhouseConfigService {
  private static config: JoyhouseConfig;

  static loadConfig(): JoyhouseConfig {
    if (!JoyhouseConfigService.config) {
      let uploadDir = process.env.UPLOAD_DIR;
      let domain = process.env.UPLOAD_DOMAIN;
      let fileDomain = process.env.FILE_DOMAIN;
      let dbType: 'sqlite' | 'postgresql' = 'sqlite'; // default to sqlite
      let dbHost: string | undefined;
      let dbPort: number | undefined;
      let dbUser: string | undefined;
      let dbPassword: string | undefined;
      let dbName: string | undefined;
      let logging: LoggingConfig | undefined;
      let cors: CorsConfig | undefined;
      let monitoring: MonitoringConfig | undefined;

      // 默认监控配置
      const defaultMonitoring: MonitoringConfig = {
        enabled: true,
        websocket: {
          port: 1666,
          namespace: '/workflow-monitor',
          corsOrigin: '*',
        },
        performance: {
          trackingEnabled: true,
          retentionHours: 24,
          warningThresholdMs: 5000,
          criticalThresholdMs: 30000,
        },
        events: {
          enableNodeEvents: true,
          enableWorkflowEvents: true,
          enablePerformanceEvents: true,
        },
      };

      try {
        const config = yaml.load(
          fs.readFileSync(CONFIG_PATH, 'utf8'),
        ) as JoyhouseConfig;
        uploadDir = uploadDir || config.uploadDir;
        domain = domain || config.domain;
        fileDomain = fileDomain || config.fileDomain;
        if (config.dbType) {
          dbType = config.dbType;
          dbHost = config.dbHost;
          dbPort = config.dbPort;
          dbUser = config.dbUser;
          dbPassword = config.dbPassword;
          dbName = config.dbName;
        }
        logging = config.logging;
        cors = config.cors;
        monitoring = config.monitoring || defaultMonitoring;
      } catch (error) {
        console.error('Failed to load config file:', error);
        monitoring = defaultMonitoring;
      }

      // 环境变量覆盖监控配置
      if (monitoring) {
        monitoring.enabled =
          process.env.MONITORING_ENABLED === 'true'
            ? true
            : process.env.MONITORING_ENABLED === 'false'
              ? false
              : monitoring.enabled;

        monitoring.websocket.port = process.env.WEBSOCKET_PORT
          ? parseInt(process.env.WEBSOCKET_PORT)
          : monitoring.websocket.port;

        monitoring.websocket.namespace =
          process.env.WEBSOCKET_NAMESPACE || monitoring.websocket.namespace;

        monitoring.websocket.corsOrigin =
          process.env.WEBSOCKET_CORS_ORIGIN || monitoring.websocket.corsOrigin;

        monitoring.performance.trackingEnabled =
          process.env.PERFORMANCE_TRACKING_ENABLED === 'true'
            ? true
            : process.env.PERFORMANCE_TRACKING_ENABLED === 'false'
              ? false
              : monitoring.performance.trackingEnabled;

        monitoring.performance.retentionHours = process.env
          .PERFORMANCE_METRICS_RETENTION_HOURS
          ? parseInt(process.env.PERFORMANCE_METRICS_RETENTION_HOURS)
          : monitoring.performance.retentionHours;

        monitoring.performance.warningThresholdMs = process.env
          .PERFORMANCE_WARNING_THRESHOLD_MS
          ? parseInt(process.env.PERFORMANCE_WARNING_THRESHOLD_MS)
          : monitoring.performance.warningThresholdMs;

        monitoring.performance.criticalThresholdMs = process.env
          .PERFORMANCE_CRITICAL_THRESHOLD_MS
          ? parseInt(process.env.PERFORMANCE_CRITICAL_THRESHOLD_MS)
          : monitoring.performance.criticalThresholdMs;

        monitoring.events.enableNodeEvents =
          process.env.ENABLE_NODE_EVENTS === 'true'
            ? true
            : process.env.ENABLE_NODE_EVENTS === 'false'
              ? false
              : monitoring.events.enableNodeEvents;

        monitoring.events.enableWorkflowEvents =
          process.env.ENABLE_WORKFLOW_EVENTS === 'true'
            ? true
            : process.env.ENABLE_WORKFLOW_EVENTS === 'false'
              ? false
              : monitoring.events.enableWorkflowEvents;

        monitoring.events.enablePerformanceEvents =
          process.env.ENABLE_PERFORMANCE_EVENTS === 'true'
            ? true
            : process.env.ENABLE_PERFORMANCE_EVENTS === 'false'
              ? false
              : monitoring.events.enablePerformanceEvents;
      }

      JoyhouseConfigService.config = {
        uploadDir: uploadDir || './uploads',
        domain: domain || 'http://localhost:1666',
        fileDomain,
        dbType,
        dbHost,
        dbPort,
        dbUser,
        dbPassword,
        dbName,
        logging,
        cors,
        monitoring,
      };
    }
    return JoyhouseConfigService.config;
  }

  // 便捷方法获取监控配置
  static getMonitoringConfig(): MonitoringConfig {
    const config = this.loadConfig();
    return config.monitoring!;
  }
}
