import * as fs from 'fs';
import * as yaml from 'js-yaml';

const CONFIG_PATH = __dirname + '/../../joyhouse.yaml';

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
      try {
        const config = yaml.load(fs.readFileSync(CONFIG_PATH, 'utf8')) as JoyhouseConfig;
        uploadDir = uploadDir || config.uploadDir;
        domain = domain || config.domain;
        fileDomain = fileDomain || config.fileDomain;
        dbType = config.dbType || dbType;
        dbHost = config.dbHost;
        dbPort = config.dbPort;
        dbUser = config.dbUser;
        dbPassword = config.dbPassword;
        dbName = config.dbName;
        logging = config.logging;
        cors = config.cors;
      } catch {}
      JoyhouseConfigService.config = {
        uploadDir: uploadDir!,
        domain: domain!,
        fileDomain,
        dbType,
        dbHost,
        dbPort,
        dbUser,
        dbPassword,
        dbName,
        logging,
        cors,
      };
    }
    return JoyhouseConfigService.config;
  }
}
