import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Knowledgebase } from './knowledgebase.entity';
import { KnowledgeChunk } from './entities/knowledge-chunk.entity';
import { KnowledgebaseService } from './knowledgebase.service';
import { SemanticSearchService } from './services/semantic-search.service';
import { DocumentProcessingService } from './services/document-processing.service';
import { DocumentServiceClient } from './services/document-service.client';
import { KnowledgebaseController } from './knowledgebase.controller';
import { HttpClientService } from '../common/http/http-client.service';

// 新增的Agent对话实体
import { AgentConversation, AgentMessage, KnowledgeEvolution } from './entities/agent-conversation.entity';

// 集成Storage模块
import { StorageModule } from '../storage/storage.module';
import { Storage } from '../storage/storage.entity';
import { StorageDir } from '../storage/storage-dir.entity';
import { FileContent } from '../storage/file-content.entity';
import { Block } from '../storage/block.entity';

// 集成其他必要模块
import { UserModule } from '../user/user.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // 知识库相关实体
      Knowledgebase,
      KnowledgeChunk,
      
      // Agent对话相关实体
      AgentConversation,
      AgentMessage,
      KnowledgeEvolution,
      
      // Storage相关实体 - 为了关联查询
      Storage,
      StorageDir,
      FileContent,
      Block,
    ]),
    
    // 导入相关模块
    forwardRef(() => StorageModule), // 避免循环依赖
    forwardRef(() => UserModule),
    WorkflowModule,
  ],
  
  providers: [
    KnowledgebaseService,
    SemanticSearchService,
    DocumentProcessingService,
    HttpClientService,
    DocumentServiceClient,
  ],
  
  controllers: [
    KnowledgebaseController,
  ],
  
  exports: [
    KnowledgebaseService,
    SemanticSearchService,
    DocumentProcessingService,
    DocumentServiceClient,
    TypeOrmModule, // 导出TypeOrmModule供其他模块使用
  ],
})
export class KnowledgebaseModule {}
