import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsDateString,
  IsNumber,
  IsDate,
  IsUUID,
} from 'class-validator';
import { TaskStatus, TaskType } from './task-query.dto';

export class TaskCreateDto {
  @ApiProperty({ description: '任务名称' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: '任务图标', required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ description: '任务描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: '任务状态',
    enum: TaskStatus,
    example: TaskStatus.PENDING,
    default: TaskStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus = TaskStatus.PENDING;

  @ApiProperty({ description: '任务进度', default: 0 })
  @IsNumber()
  progress: number;

  @ApiProperty({
    description: '任务类型',
    enum: TaskType,
    example: TaskType.DAILY,
    default: TaskType.CUSTOM,
  })
  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType = TaskType.CUSTOM;

  @ApiProperty({
    description: '额外参数（JSON格式）',
    required: false,
    example: { key: 'value' },
  })
  @IsOptional()
  @IsObject()
  params?: Record<string, any>;

  @ApiProperty({ description: '奖励ID', required: false })
  @IsUUID()
  @IsOptional()
  rewardId?: string;

  @ApiProperty({ description: '任务组ID' })
  @IsString()
  taskGroupId: string;

  @ApiProperty({ description: '任务截止时间', required: false })
  @IsDate()
  @IsOptional()
  dueDate?: Date;
}
