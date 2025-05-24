import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsObject,
  IsUUID,
} from 'class-validator';
import { TaskType, TaskPriority } from '../entities/collaboration-task.entity';
import {
  AgentRole,
  AgentSpecialization,
} from '../entities/specialized-agent.entity';
import { MessageType } from '../entities/collaboration-message.entity';

export class CreateCollaborationRoomDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  participantIds: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  agentIds: string[];

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  settings?: {
    autoApproval?: boolean;
    requireUserConfirmation?: boolean;
    maxRetries?: number;
    evaluationThreshold?: number;
    allowedFileTypes?: string[];
    maxFileSize?: number;
  };
}

export class CreateCollaborationTaskDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  originalRequirement: string;

  @ApiProperty({ enum: TaskType })
  @IsEnum(TaskType)
  type: TaskType;

  @ApiProperty({ enum: TaskPriority, required: false })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiProperty()
  @IsUUID('4')
  roomId: string;

  @ApiProperty({ required: false })
  @IsUUID('4')
  @IsOptional()
  coordinatorAgentId?: string;

  @ApiProperty({ required: false })
  @IsUUID('4')
  @IsOptional()
  requirementAnalysisAgentId?: string;

  @ApiProperty({ required: false })
  @IsUUID('4')
  @IsOptional()
  workAgentId?: string;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    size: number;
  }>;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  context?: {
    variables?: Record<string, any>;
    metadata?: Record<string, any>;
  };

  @ApiProperty({ required: false })
  @IsOptional()
  deadline?: Date;
}

export class SendMessageDto {
  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty({ enum: MessageType, required: false })
  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType;

  @ApiProperty({ required: false })
  @IsUUID('4')
  @IsOptional()
  relatedTaskId?: string;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    size: number;
    mimeType: string;
  }>;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  mentions?: Array<{
    type: 'user' | 'agent';
    id: string;
    name: string;
  }>;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  metadata?: {
    isApprovalRequest?: boolean;
    requiresResponse?: boolean;
    responseDeadline?: Date;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    tags?: string[];
  };
}

export class CreateSpecializedAgentDto {
  @ApiProperty()
  @IsUUID('4')
  baseAgentId: string;

  @ApiProperty({ enum: AgentRole })
  @IsEnum(AgentRole)
  role: AgentRole;

  @ApiProperty({ enum: AgentSpecialization, required: false })
  @IsEnum(AgentSpecialization)
  @IsOptional()
  specialization?: AgentSpecialization;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  capabilities?: {
    canAnalyzeRequirements?: boolean;
    canCreatePlans?: boolean;
    canExecuteTasks?: boolean;
    canEvaluateResults?: boolean;
    canCoordinate?: boolean;
    supportedTaskTypes?: string[];
    supportedFileTypes?: string[];
    maxConcurrentTasks?: number;
  };

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  configuration?: any;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  maxLoad?: number;
}

export class TaskFeedbackDto {
  @ApiProperty()
  @IsString()
  feedback: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  approved?: boolean;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  suggestions?: string[];

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class EvaluationRequestDto {
  @ApiProperty()
  @IsUUID('4')
  taskId: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  evaluatorAgentIds: string[];

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  criteria?: {
    completeness?: number;
    quality?: number;
    accuracy?: number;
    usability?: number;
    performance?: number;
  };
}
