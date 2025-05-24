import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './common/response.interceptor';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { LoggingInterceptor } from './common/logging.interceptor';

import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { JoyhouseConfigService } from './common/joyhouse-config';
import { JoyhouseLoggerService } from './common/logger.service';
import { Logger } from '@nestjs/common';

import * as fs from 'fs';

async function bootstrap() {
  // 通过配置决定是否启用 https
  const config = JoyhouseConfigService.loadConfig();

  // 数据库路径日志
  if (config.dbType === 'sqlite') {
    let dbFile = config.dbName;
    if (!dbFile) {
      const os = require('os');
      const path = require('path');
      let userDataDir = '';
      const platform = os.platform();
      if (platform === 'win32') {
        userDataDir = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
      } else if (platform === 'darwin') {
        userDataDir = path.join(os.homedir(), 'Library', 'Application Support');
      } else {
        userDataDir = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
      }
      dbFile = path.join(userDataDir, 'joyhouse', 'joyhouse.db');
    }
    console.log('[数据库] SQLite 数据库文件路径:', dbFile);
  } else {
    console.log('[数据库] 类型:', config.dbType, '主机:', config.dbHost, '端口:', config.dbPort, '库名:', config.dbName);
  }
  
  // 默认的 CORS 配置
  const corsConfig = config.cors || {
    origin: '*',  // 允许所有来源访问
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS'
  };

  let app;
  if (config.httpsEnabled) {
    const httpsOptions = {
      key: fs.readFileSync(join(process.cwd(), 'cert/key.pem')),
      cert: fs.readFileSync(join(process.cwd(), 'cert/cert.pem')),
    };
    app = await NestFactory.create<NestExpressApplication>(AppModule, { 
      httpsOptions,
      cors: corsConfig,
      logger: ['error', 'warn', 'log', 'debug', 'verbose'], // 启用所有日志级别
    });
    console.log('[启动] HTTPS 已启用');
  } else {
    app = await NestFactory.create<NestExpressApplication>(AppModule, {
      cors: corsConfig,
      logger: ['error', 'warn', 'log', 'debug', 'verbose'], // 启用所有日志级别
    });
    console.log('[启动] HTTP（未启用 https）');
  }

  // 统一用 JoyhouseConfigService 获取上传目录
  const staticPath = join(process.cwd(), config.uploadDir);
  const staticPrefix = '/uploads/';
  
  // 添加静态文件服务，用于提供 favicon.ico 等公共资源
  const publicPath = join(process.cwd(), 'src', 'public');
  app.useStaticAssets(publicPath);
  
  console.log('[静态资源目录]', staticPath, '映射前缀', staticPrefix);
  app.useStaticAssets(staticPath, { prefix: staticPrefix });
  app.setGlobalPrefix('api',
    {
      exclude: ['/'],
    }
  );
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true, 
    transform: true,
    transformOptions: {
      enableImplicitConversion: true
    }
  }));

  app.useGlobalInterceptors(new ResponseInterceptor());
  
  // 创建日志服务实例并注入到拦截器
  const logger = app.get(JoyhouseLoggerService);
  app.useGlobalInterceptors(new LoggingInterceptor(logger));
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger 文档配置
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Joyhouse API')
    .setDescription('API 文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('swagger', app, document);

  const port = process.env.PORT ?? 1666;
  await app.listen(port, '0.0.0.0');
  
  const loggerBootstrap = new Logger('Bootstrap');
  loggerBootstrap.log(`Swagger 文档已生成: http://localhost:${port}/swagger`);
  loggerBootstrap.log(`服务已启动，监听所有网络接口: 0.0.0.0:${port}`);
}
bootstrap();
