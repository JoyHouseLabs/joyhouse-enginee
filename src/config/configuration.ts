import { JoyhouseConfigService } from '../common/joyhouse-config';

export default () => {
  const config = JoyhouseConfigService.loadConfig();
  
  return {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
    database: {
      type: config.dbType,
      host: config.dbHost || process.env.DB_HOST || 'localhost',
      port: config.dbPort || (process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306),
      username: config.dbUser || process.env.DB_USERNAME || 'root',
      password: config.dbPassword || process.env.DB_PASSWORD || 'root',
      database: config.dbName || process.env.DB_DATABASE || 'joyhouse',
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
    upload: {
      dir: config.uploadDir,
      domain: config.domain,
      fileDomain: config.fileDomain,
    },
    logging: config.logging,
    cors: config.cors,
    nodeEnv: process.env.NODE_ENV || 'development',
  };
}; 