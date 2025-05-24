import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';

// Entities
import { CollaborationRoom } from './entities/collaboration-room.entity';
import { CollaborationTask } from './entities/collaboration-task.entity';
import { TaskStep } from './entities/task-step.entity';
import { TaskEvaluation } from './entities/task-evaluation.entity';
import { CollaborationMessage } from './entities/collaboration-message.entity';
import { CollaborationDocument } from './entities/collaboration-document.entity';
import { SpecializedAgent } from './entities/specialized-agent.entity';

// Services
import { CollaborationEngineService } from './services/collaboration-engine.service';

// Controllers
import { CollaborationController } from './controllers/collaboration.controller';

// Gateways
import { CollaborationRealtimeGateway } from './gateways/collaboration-realtime.gateway';

// External modules
import { AgentModule } from '../agent/agent.module';
import { LlmModule } from '../llm/llm.module';
import { ToolModule } from '../tool/tool.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CollaborationRoom,
      CollaborationTask,
      TaskStep,
      TaskEvaluation,
      CollaborationMessage,
      CollaborationDocument,
      SpecializedAgent,
    ]),
    EventEmitterModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
    AgentModule,
    LlmModule,
    ToolModule,
    WorkflowModule,
    UserModule,
    AuthModule,
  ],
  controllers: [CollaborationController],
  providers: [CollaborationEngineService, CollaborationRealtimeGateway],
  exports: [CollaborationEngineService, CollaborationRealtimeGateway],
})
export class MultiAgentModule {}
