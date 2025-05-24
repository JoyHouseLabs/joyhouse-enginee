import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsUUID,
  IsObject,
  IsEnum,
  IsArray,
  IsNumber,
  IsDate,
} from 'class-validator';
import { TaskType } from './task-query.dto';
import { TaskItem } from './task-item.entity';
import { TaskGroup } from './task-group.entity';

export class TaskItemDto {
  @ApiProperty({ description: '任务项ID' })
  id: string;

  @ApiProperty({ description: '任务项名称' })
  name: string;

  @ApiProperty({ description: '任务项图标' })
  icon: string;

  @ApiProperty({ description: '任务项描述', required: false })
  description?: string;

  @ApiProperty({ description: '任务组ID' })
  taskGroupId: string;

  @ApiProperty({ description: '任务组', type: () => TaskGroup })
  taskGroup: TaskGroup;

  @ApiProperty({ description: '任务类型', enum: TaskType })
  type: TaskType;

  @ApiProperty({ description: '任务参数', required: false })
  params?: Record<string, any>;

  @ApiProperty({ description: '是否启用', default: true })
  isActive: boolean;

  @ApiProperty({ description: '排序权重', default: 0 })
  weight: number;

  @ApiProperty({
    description: '前置任务ID列表',
    required: false,
    type: [String],
  })
  prerequisites?: string[];

  @ApiProperty({ description: '奖励配置', required: false })
  rewards?: string;

  @ApiProperty({ description: '奖励ID', required: false })
  rewardId?: string;

  @ApiProperty({ description: '截止时间', required: false })
  dueDate?: Date;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

export class CreateTaskItemDto {
  @ApiProperty({ description: '任务项名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '任务项图标' })
  @IsString()
  icon: string;

  @ApiProperty({ description: '任务项描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '任务组ID' })
  @IsString()
  taskGroupId: string;

  @ApiProperty({ description: '前置任务ID列表' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  prerequisites?: string[];

  @ApiProperty({ description: '任务项类型' })
  @IsString()
  type: string;

  @ApiProperty({ description: '任务项参数' })
  @IsOptional()
  params?: Record<string, any>;

  @ApiProperty({ description: '奖励ID' })
  @IsString()
  @IsOptional()
  rewardId?: string;

  @ApiProperty({ description: '截止时间', required: false })
  @IsDate()
  @IsOptional()
  dueDate?: Date;
}

export class UpdateTaskItemDto extends CreateTaskItemDto {
  @ApiProperty({ description: '任务项ID' })
  @IsString()
  id: string;
}

export class TaskItemQueryDto {
  @ApiProperty({ description: '任务组ID' })
  @IsString()
  @IsOptional()
  taskGroupId?: string;

  @ApiProperty({ description: '任务项类型' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({ description: '截止时间', required: false })
  @IsDate()
  @IsOptional()
  dueDate?: Date;
}
