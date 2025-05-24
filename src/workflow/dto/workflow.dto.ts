import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  WorkflowStatus,
  WorkflowNode,
  WorkflowEdge,
  WorkflowTrigger,
} from '../entities/workflow.entity';

export class WorkflowNodeDto {
  @ApiProperty({ description: '节点ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: '节点类型' })
  @IsString()
  type: string;

  @ApiProperty({ description: '节点标签' })
  @IsString()
  label: string;

  @ApiProperty({ description: '节点位置' })
  @IsObject()
  position: { x: number; y: number };

  @ApiProperty({ description: '节点数据' })
  @IsObject()
  data: Record<string, any>;
}

export class WorkflowEdgeDto {
  @ApiProperty({ description: '边ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: '源节点ID' })
  @IsString()
  source: string;

  @ApiProperty({ description: '目标节点ID' })
  @IsString()
  target: string;

  @ApiProperty({ description: '边标签', required: false })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiProperty({ description: '条件', required: false })
  @IsString()
  @IsOptional()
  condition?: string;

  @ApiProperty({ description: '边数据', required: false })
  @IsObject()
  @IsOptional()
  data?: any;
}

export class WorkflowTriggerDto {
  @ApiProperty({ description: '触发器类型' })
  @IsString()
  type: string;

  @ApiProperty({ description: '触发器配置' })
  @IsObject()
  config: Record<string, any>;
}

export class CreateWorkflowDto {
  @ApiProperty({ description: '工作流名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '工作流描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '节点列表', type: [WorkflowNodeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowNodeDto)
  nodes: WorkflowNodeDto[];

  @ApiProperty({ description: '边列表', type: [WorkflowEdgeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowEdgeDto)
  edges: WorkflowEdgeDto[];

  @ApiProperty({ description: '变量', required: false })
  @IsObject()
  @IsOptional()
  variables?: Record<string, any>;

  @ApiProperty({
    description: '触发器',
    type: [WorkflowTriggerDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowTriggerDto)
  @IsOptional()
  triggers?: WorkflowTriggerDto[];

  @ApiProperty({ description: '是否为模板', default: false })
  @IsBoolean()
  @IsOptional()
  isTemplate?: boolean;
}

export class UpdateWorkflowDto extends CreateWorkflowDto {
  @ApiProperty({
    description: '工作流状态',
    enum: WorkflowStatus,
    required: false,
  })
  @IsEnum(WorkflowStatus)
  @IsOptional()
  status?: WorkflowStatus;
}

export class ExecuteWorkflowDto {
  @ApiProperty({ description: '执行输入参数', required: false })
  @IsObject()
  @IsOptional()
  input?: Record<string, any>;

  @ApiProperty({ description: '触发类型', required: false })
  @IsString()
  @IsOptional()
  triggerType?: string;

  @ApiProperty({ description: '触发数据', required: false })
  @IsObject()
  @IsOptional()
  triggerData?: any;
}

export class ContinueExecutionDto {
  @ApiProperty({ description: '用户输入数据' })
  @IsObject()
  input: Record<string, any>;
}

export class ApprovalDto {
  @ApiProperty({ description: '审批结果' })
  @IsBoolean()
  approved: boolean;

  @ApiProperty({ description: '审批意见', required: false })
  @IsString()
  @IsOptional()
  comment?: string;
}
