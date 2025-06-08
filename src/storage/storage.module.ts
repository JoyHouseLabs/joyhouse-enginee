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

// 新增的Notion风格实体
import { Block } from './block.entity';
import { LinkGraph } from './link-graph.entity';
import { Template } from './templates.entity';

// 新增的工作流实体
import { DataWorkflow, WorkflowExecution } from './data-workflow.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Storage,
      StorageDir,
      FileContent,
      Block,          // 块系统
      LinkGraph,      // 链接图谱
      Template,       // 模板系统
      DataWorkflow,   // 数据工作流
      WorkflowExecution, // 工作流执行历史
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
