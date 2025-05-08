import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Knowledgebase } from '../entities/knowledgebase.entity';
import { Knowledgefile } from '../entities/knowledgefile.entity';
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
