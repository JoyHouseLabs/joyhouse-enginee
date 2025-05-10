import { Injectable, LoggerService } from '@nestjs/common';
import { JoyhouseConfigService, LoggingConfig } from './joyhouse-config';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { join } from 'path';
import * as fs from 'fs';

@Injectable()
export class JoyhouseLoggerService implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    const config = JoyhouseConfigService.loadConfig();
    const defaultLogConfig: LoggingConfig = {
      dir: 'logs',
      level: 'info',
      console: true,
      maxSize: 10,
      maxFiles: 30,
      dailyRotate: true
    };
    
    const logConfig: LoggingConfig = {
      ...defaultLogConfig,
      ...(config.logging || {})
    };
    
    // 确保日志目录存在
    const logDir = join(process.cwd(), logConfig.dir);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const transports: winston.transport[] = [];

    // 添加日志文件传输
    if (logConfig.dailyRotate) {
      transports.push(
        new winston.transports.DailyRotateFile({
          dirname: logDir,
          filename: 'joyhouse-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: `${logConfig.maxSize}m`,
          maxFiles: logConfig.maxFiles,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      );
    }

    // 添加控制台输出
    if (logConfig.console) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level, message }) => {
              return `[Joyhouse] ${timestamp} ${level}: ${message}`;
            })
          )
        })
      );
    }

    this.logger = winston.createLogger({
      level: logConfig.level,
      transports
    });
  }

  log(message: string) {
    this.logger.info(message);
  }

  error(message: string, trace?: string) {
    this.logger.error(message + (trace ? `\n${trace}` : ''));
  }

  warn(message: string) {
    this.logger.warn(message);
  }

  debug(message: string) {
    this.logger.debug(message);
  }

  verbose(message: string) {
    this.logger.verbose(message);
  }
} 