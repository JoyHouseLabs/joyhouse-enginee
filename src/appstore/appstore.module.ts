import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppStoreController } from './appstore.controller';
import { AppStoreService } from './appstore.service';
import { App } from './app.entity';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([App]),
    UserModule,
  ],
  controllers: [AppStoreController],
  providers: [AppStoreService],
  exports: [AppStoreService],
})
export class AppStoreModule {} 