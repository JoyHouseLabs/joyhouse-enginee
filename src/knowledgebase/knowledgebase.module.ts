import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Knowledgebase } from './knowledgebase.entity';
import { KnowledgeChunk } from './entities/knowledge-chunk.entity';
import { KnowledgebaseService } from './knowledgebase.service';
import { SemanticSearchService } from './services/semantic-search.service';
import { DocumentProcessingService } from './services/document-processing.service';
import { DocumentServiceClient } from './services/document-service.client';
import { FileUploadedHandler } from './events/file-uploaded.handler';
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
import { DataWorkflow, WorkflowExecution } from '../storage/data-workflow.entity';

// 集成其他必要模块
import { UserModule } from '../user/user.module';
import { MultimodalModule } from '../multimodal/multimodal.module';

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
      DataWorkflow,
      WorkflowExecution,
    ]),
    
    // 导入相关模块
    forwardRef(() => StorageModule), // 避免循环依赖
    forwardRef(() => UserModule),
    MultimodalModule, // 用于向量化和多模态处理
  ],
  
  providers: [
    KnowledgebaseService,
    SemanticSearchService,
    DocumentProcessingService,
    HttpClientService,
    DocumentServiceClient,
    FileUploadedHandler,
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
