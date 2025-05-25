import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { App } from './app.entity';
import { AppSubscribe } from './app-subscribe.entity';
import { AppStoreController } from './appstore.controller';
import { AppStoreService } from './appstore.service';
import { AppSubscribeController } from './app-subscribe.controller';
import { AppSubscribeService } from './app-subscribe.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([App, AppSubscribe]),
  ],
  controllers: [AppStoreController, AppSubscribeController],
  providers: [AppStoreService, AppSubscribeService],
  exports: [AppStoreService, AppSubscribeService],
})
export class AppStoreModule {} 