import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { AgentRealtimeGateway } from './gateways/agent-realtime.gateway';
import { WsJwtAuthGuard } from '../auth/guards/ws-jwt-auth.guard';
import { Agent } from './entities/agent.entity';
import { Conversation } from './entities/conversation.entity';
import { ConversationHistory } from './entities/conversation-history.entity';
import { LlmModule } from '../llm/llm.module';
import { ToolModule } from '../tool/tool.module';
import { McpModule } from '../mcp/mcp.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent, Conversation, ConversationHistory]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'joyhouse-secret',
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
    UserModule,
    LlmModule,
    ToolModule,
    McpModule,
    forwardRef(() => WorkflowModule),
  ],
  controllers: [AgentController],
  providers: [AgentService, AgentRealtimeGateway, WsJwtAuthGuard],
  exports: [AgentService, AgentRealtimeGateway, TypeOrmModule],
})
export class AgentModule {}
