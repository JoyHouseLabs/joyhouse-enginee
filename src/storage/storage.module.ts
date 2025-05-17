import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Storage } from './storage.entity';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';

import { RoleModule } from '../role/role.module';

@Module({
  imports: [TypeOrmModule.forFeature([Storage, require('./storage-dir.entity').StorageDir]), RoleModule],
  providers: [StorageService],
  controllers: [StorageController],
  exports: [StorageService],
})
export class StorageModule {}
