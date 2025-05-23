import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrainController } from './brain.controller';
import { BrainService } from './brain.service';
import { LlmModel } from '../llm/llm-model.entity';
import { LlmProvider } from '../llm/llm-provider.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LlmModel, LlmProvider])],
  controllers: [BrainController],
  providers: [BrainService],
})
export class BrainModule {} 