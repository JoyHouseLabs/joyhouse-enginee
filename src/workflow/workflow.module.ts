import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';
import { WorkflowEngineService } from './services/workflow-engine.service';
import { WorkflowEventService } from './services/workflow-event.service';
import { WorkflowEventController } from './controllers/workflow-event.controller';
import { Workflow } from './entities/workflow.entity';
import { WorkflowExecution } from './entities/workflow-execution.entity';
import { WorkflowExecutionStep } from './entities/workflow-execution-step.entity';
import { ToolModule } from '../tool/tool.module';
import { AgentModule } from '../agent/agent.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Workflow, WorkflowExecution, WorkflowExecutionStep]),
    EventEmitterModule.forRoot(),
    ToolModule,
    AgentModule,
  ],
  controllers: [WorkflowController, WorkflowEventController],
  providers: [WorkflowService, WorkflowEngineService, WorkflowEventService],
  exports: [WorkflowService, WorkflowEngineService, WorkflowEventService, TypeOrmModule],
})
export class WorkflowModule {} 