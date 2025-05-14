import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Knowledgebase } from './knowledgebase.entity';
import { Knowledgefile } from './knowledgefile.entity';
import { KnowledgebaseService } from './knowledgebase.service';
import { KnowledgefileService } from './knowledgefile.service';
import { KnowledgebaseController } from './knowledgebase.controller';
import { KnowledgefileController } from './knowledgefile.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Knowledgebase, Knowledgefile])],
  providers: [KnowledgebaseService, KnowledgefileService],
  controllers: [KnowledgebaseController, KnowledgefileController],
  exports: [KnowledgebaseService, KnowledgefileService],
})
export class KnowledgebaseModule {}
