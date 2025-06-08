import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';
import { WorkflowEngineService } from './services/workflow-engine.service';
import { WorkflowEventService } from './services/workflow-event.service';
import { WorkflowRealtimeService } from './services/workflow-realtime.service';
import { WorkflowEventController } from './controllers/workflow-event.controller';
import { WsJwtAuthGuard } from '../auth/guards/ws-jwt-auth.guard';
import { Workflow } from './entities/workflow.entity';
import { WorkflowExecution } from './entities/workflow-execution.entity';
import { WorkflowExecutionStep } from './entities/workflow-execution-step.entity';
import { ToolModule } from '../tool/tool.module';
import { AgentModule } from '../agent/agent.module';
import { McpModule } from '../mcp/mcp.module';
import { LlmModule } from '../llm/llm.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Workflow,
      WorkflowExecution,
      WorkflowExecutionStep,
    ]),
    EventEmitterModule.forRoot(),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'joyhouse-secret',
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
    forwardRef(() => UserModule),
    ToolModule,
    forwardRef(() => AgentModule),
    McpModule,
    LlmModule,
  ],
  controllers: [WorkflowController, WorkflowEventController],
  providers: [
    WorkflowService,
    WorkflowEngineService,
    WorkflowEventService,
    WorkflowRealtimeService,
    WsJwtAuthGuard,
  ],
  exports: [
    WorkflowService,
    WorkflowEngineService,
    WorkflowEventService,
    WorkflowRealtimeService,
    TypeOrmModule,
  ],
})
export class WorkflowModule {}
