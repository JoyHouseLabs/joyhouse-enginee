import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { Agent } from './entities/agent.entity';
import { Conversation } from './entities/conversation.entity';
import { ConversationHistory } from './entities/conversation-history.entity';
import { LlmModule } from '../llm/llm.module';
import { ToolModule } from '../tool/tool.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent, Conversation, ConversationHistory]),
    LlmModule,
    ToolModule,
  ],
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService, TypeOrmModule],
})
export class AgentModule {} 