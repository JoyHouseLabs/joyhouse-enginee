import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Knowledgebase } from './knowledgebase.entity';
import { Knowledgefile } from './knowledgefile.entity';
import { KnowledgeChunk } from './entities/knowledge-chunk.entity';
import { KnowledgebaseService } from './knowledgebase.service';
import { KnowledgefileService } from './knowledgefile.service';
import { SemanticSearchService } from './services/semantic-search.service';
import { DocumentProcessingService } from './services/document-processing.service';
import { DocumentServiceClient } from './services/document-service.client';
import { FileUploadedHandler } from './events/file-uploaded.handler';
import { KnowledgebaseController } from './knowledgebase.controller';
import { KnowledgefileController } from './knowledgefile.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Knowledgebase,
      Knowledgefile,
      KnowledgeChunk,
    ]),
  ],
  providers: [
    KnowledgebaseService,
    KnowledgefileService,
    SemanticSearchService,
    DocumentProcessingService,
    DocumentServiceClient,
    FileUploadedHandler,
  ],
  controllers: [
    KnowledgebaseController,
    KnowledgefileController,
  ],
  exports: [
    KnowledgebaseService,
    KnowledgefileService,
    SemanticSearchService,
    DocumentProcessingService,
    DocumentServiceClient,
  ],
})
export class KnowledgebaseModule {}
