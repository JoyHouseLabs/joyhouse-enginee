import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Storage } from './storage.entity';
import { StorageDir } from './storage-dir.entity';
import { StorageService } from './storage.service';
import { ContentExtractorService } from './content-extractor.service';
import { TextExtractor } from './extractors/text.extractor';
import { FileContent } from './file-content.entity';
import { UserModule } from '../user/user.module';
import { StorageController } from './storage.controller';
import { MultimodalModule } from '../multimodal/multimodal.module';

import { RoleModule } from '../role/role.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Storage,
      StorageDir,
      FileContent,
    ]),
    forwardRef(() => UserModule),
    RoleModule,
    MultimodalModule,
  ],
  providers: [
    StorageService,
    ContentExtractorService,
    TextExtractor,
  ],
  controllers: [StorageController],
  exports: [StorageService, TypeOrmModule],
})
export class StorageModule {}
