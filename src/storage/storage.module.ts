import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Storage } from './storage.entity';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { StorageDir } from './storage-dir.entity';
import { PersonalSettings } from './personal-settings.entity';
import { FileContent } from './file-content.entity';
import { DataLineageNode } from './data-lineage.entity';
import { Block } from './block.entity';
import { Template } from './templates.entity';
import { LinkGraph } from './link-graph.entity';
import { McpModule } from '../mcp/mcp.module';
import { ToolModule } from '../tool/tool.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { UserModule } from '../user/user.module';
import { KnowledgebaseModule } from '../knowledgebase/knowledgebase.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Storage,
      StorageDir,
      PersonalSettings,
      FileContent,
      DataLineageNode,
      Block,
      Template,
      LinkGraph,
    ]),
    McpModule,
    ToolModule,
    WorkflowModule,
    UserModule,
    KnowledgebaseModule,
  ],
  providers: [
    StorageService,
    
  ],
  controllers: [StorageController],
  exports: [StorageService],
})
export class StorageModule {}
