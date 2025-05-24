import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsUUID,
  IsObject,
  IsArray,
} from 'class-validator';
import { TaskItemDto } from './task-item.dto';

export class TaskGroupDto {
  @ApiProperty({ description: '任务组ID' })
  id: string;

  @ApiProperty({ description: '任务组名称' })
  name: string;

  @ApiProperty({ description: '任务组图标', required: false })
  icon?: string;

  @ApiProperty({ description: '任务组描述', required: false })
  description?: string;

  @ApiProperty({ description: '额外参数', required: false })
  params?: any;

  @ApiProperty({ description: '是否启用' })
  isActive: boolean;

  @ApiProperty({ description: '排序权重' })
  weight: number;

  @ApiProperty({ description: '触发条件', required: false })
  trigger?: any;

  @ApiProperty({ description: '奖励配置', required: false })
  rewards?: any;

  @ApiProperty({ description: '关联的奖励ID', required: false })
  rewardId?: string;

  @ApiProperty({ description: '是否需要在所有任务完成后才发放奖励' })
  requireAllTasksCompleted: boolean;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  @ApiProperty({
    description: '任务项列表',
    type: () => [TaskItemDto],
    required: false,
  })
  taskItems?: TaskItemDto[];
}

export class CreateTaskGroupDto {
  @ApiProperty({ description: '任务组名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '任务组图标', required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ description: '任务组描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '额外参数', required: false })
  @IsObject()
  @IsOptional()
  params?: any;

  @ApiProperty({ description: '是否启用', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: '排序权重', default: 0 })
  @IsInt()
  @IsOptional()
  weight?: number;

  @ApiProperty({ description: '触发条件', required: false })
  @IsObject()
  @IsOptional()
  trigger?: any;

  @ApiProperty({ description: '奖励配置', required: false })
  @IsObject()
  @IsOptional()
  rewards?: any;

  @ApiProperty({ description: '关联的奖励ID', required: false })
  @IsUUID()
  @IsOptional()
  rewardId?: string;

  @ApiProperty({
    description: '是否需要在所有任务完成后才发放奖励',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  requireAllTasksCompleted?: boolean;

  @ApiProperty({ description: '任务项ID列表', type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  taskItemIds?: string[];
}

export class UpdateTaskGroupDto extends CreateTaskGroupDto {
  @ApiProperty({ description: '任务组ID' })
  @IsString()
  id: string;
}

export class TaskGroupQueryDto {
  @ApiProperty({ description: '任务组名称', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: '是否启用', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
