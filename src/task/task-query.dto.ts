import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum TaskType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom',
  CRON = 'cron'
}

export class TaskQueryDto {
  @ApiPropertyOptional({ description: '页码', default: '1' })
  @IsOptional()
  @IsString()
  page?: string = '1';

  @ApiPropertyOptional({ description: '每页数量', default: '20' })
  @IsOptional()
  @IsString()
  limit?: string = '20';

  @ApiPropertyOptional({ description: '任务名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ 
    description: '任务状态',
    enum: TaskStatus,
    example: TaskStatus.PENDING
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ 
    description: '任务类型',
    enum: TaskType,
    example: TaskType.DAILY
  })
  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;
}