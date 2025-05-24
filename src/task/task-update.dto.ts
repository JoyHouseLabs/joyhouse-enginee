import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum, IsObject, IsDateString, IsNumber, IsDate, IsUUID } from 'class-validator';
import { TaskStatus, TaskType } from './task-query.dto';

export class TaskUpdateDto {
  @ApiProperty({ description: '任务ID' })
  @IsNotEmpty()
  @IsString()
  id: string;

  @ApiProperty({ description: '任务名称', required: false })
  @IsOptional()
  @IsString()
  name?: string;

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
    required: false 
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({ description: '任务进度', required: false })
  @IsNumber()
  @IsOptional()
  progress?: number;

  @ApiProperty({ 
    description: '任务类型', 
    enum: TaskType,
    example: TaskType.DAILY,
    required: false 
  })
  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @ApiProperty({ 
    description: '额外参数（JSON格式）',
    required: false,
    example: { key: 'value' }
  })
  @IsOptional()
  @IsObject()
  params?: Record<string, any>;

  @ApiProperty({ description: '奖励ID', required: false })
  @IsUUID()
  @IsOptional()
  rewardId?: string;

  @ApiProperty({ description: '任务组ID', required: false })
  @IsString()
  @IsOptional()
  taskGroupId?: string;

  @ApiProperty({ 
    description: '任务截止时间',
    required: false,
    example: '2024-01-01T23:59:59.000Z'
  })
  @IsOptional()
  @IsDate()
  dueDate?: Date;

  @ApiProperty({ 
    description: '任务执行过程中的错误信息',
    required: false
  })
  @IsOptional()
  @IsString()
  error?: string;
}