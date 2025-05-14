import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Storage } from './storage.entity';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Storage])],
  providers: [StorageService],
  controllers: [StorageController],
  exports: [StorageService],
})
export class StorageModule {}
