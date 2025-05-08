import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LlmProvider } from '../entities/llm-provider.entity';
import { LlmModel } from '../entities/llm-model.entity';

import { LlmService } from './llm.service';
import { LlmController } from './llm.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LlmProvider, LlmModel])],
  providers: [LlmService],
  controllers: [LlmController],
  exports: [TypeOrmModule],
})
export class LlmModule {}
