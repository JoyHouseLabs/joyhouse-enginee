import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LlmProvider } from './llm-provider.entity';
import { LlmModel } from './llm-model.entity';

import { LlmService } from './llm.service';
import { LlmController } from './llm.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LlmProvider, LlmModel])],
  providers: [LlmService],
  controllers: [LlmController],
  exports: [LlmService],
})
export class LlmModule {}
