import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppSubscribeController } from './app-subscribe.controller';
import { AppSubscribeService } from './app-subscribe.service';
import { AppSubscribe } from './app-subscribe.entity';
import { App } from './app.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AppSubscribe, App]),
  ],
  controllers: [AppSubscribeController],
  providers: [AppSubscribeService],
  exports: [AppSubscribeService],
})
export class AppSubscribeModule {} 