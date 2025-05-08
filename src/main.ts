import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './common/response.interceptor';
import { HttpExceptionFilter } from './common/http-exception.filter';

import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { JoyhouseConfigService } from './common/joyhouse-config';

import * as fs from 'fs';

async function bootstrap() {
  // 通过配置决定是否启用 https
  const config = JoyhouseConfigService.loadConfig();
  let app;
  if (config.httpsEnabled) {
    const httpsOptions = {
      key: fs.readFileSync(join(process.cwd(), 'cert/key.pem')),
      cert: fs.readFileSync(join(process.cwd(), 'cert/cert.pem')),
    };
    app = await NestFactory.create<NestExpressApplication>(AppModule, { httpsOptions });
    console.log('[启动] HTTPS 已启用');
  } else {
    app = await NestFactory.create<NestExpressApplication>(AppModule);
    console.log('[启动] HTTP（未启用 https）');
  }

  // 统一用 JoyhouseConfigService 获取上传目录
  const staticPath = join(process.cwd(), config.uploadDir);
  const staticPrefix = '/uploads/';
  console.log('[静态资源目录]', staticPath, '映射前缀', staticPrefix);
  app.useStaticAssets(staticPath, { prefix: staticPrefix });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalInterceptors(new ResponseInterceptor());
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

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Swagger 文档已生成: http://localhost:3000/swagger`);
}
bootstrap();
