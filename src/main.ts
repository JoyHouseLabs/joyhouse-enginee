import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ResponseInterceptor } from './common/response.interceptor';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { LoggingInterceptor } from './common/logging.interceptor';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { JoyhouseConfigService } from './common/joyhouse-config';
import { JoyhouseLoggerService } from './common/logger.service';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: false, // 禁用全局 CORS，让每个模块自己处理
  });

  // 获取配置
  const config = await JoyhouseConfigService.loadConfig();
  const corsConfig = config.cors || {
    origins: ['http://localhost:5173', 'http://localhost:1666'],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  };

  // 添加手动 CORS 中间件，排除 WebSocket 路径
  app.use((req, res, next) => {
    // 如果是 WebSocket 路径，跳过 CORS 中间件
    if (req.path.startsWith('/socket.io') || req.path.startsWith('/agent-socket.io') || req.path.startsWith('/workflow-socket.io')) {
      return next();
    }

    // 设置 CORS 头
    res.header('Access-Control-Allow-Origin', corsConfig.origins);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', corsConfig.methods);
    res.header('Access-Control-Allow-Headers', 'authorization,content-type');

    // 处理预检请求
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }

    next();
  });

  // 设置全局前缀
  app.setGlobalPrefix('api');

  // 配置 Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Joyhouse API')
    .setDescription('Joyhouse API 文档')
    .setVersion('1.0')
    .addTag('joyhouse')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // 启动服务器
  const port = process.env.PORT || 1666;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger API docs available at: http://localhost:${port}/api/docs`);
}
bootstrap();
