import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus, TaskType } from './task-query.dto';

export class CreateTaskDto {
  @ApiProperty({ description: '任务名称' })
  name: string;

  @ApiProperty({ description: '任务图标' })
  icon: string;

  @ApiProperty({ description: '任务描述', required: false })
  description?: string;

  @ApiProperty({ description: '用户ID' })
  userId: string;

  @ApiProperty({
    description: '任务状态',
    enum: TaskStatus,
    default: TaskStatus.PENDING,
  })
  status: TaskStatus;

  @ApiProperty({ description: '任务进度', default: 0 })
  progress: number;

  @ApiProperty({ description: '任务类型', enum: TaskType })
  type: TaskType;

  @ApiProperty({ description: '任务参数', required: false })
  params?: Record<string, any>;

  @ApiProperty({ description: '奖励ID', required: false })
  rewardId?: string;

  @ApiProperty({ description: '任务组ID' })
  taskGroupId: string;

  @ApiProperty({ description: '截止时间', required: false })
  dueDate?: Date;

  @ApiProperty({ description: '错误信息', required: false })
  error?: string;
}

export class TaskDto extends CreateTaskDto {
  @ApiProperty({ description: '任务ID' })
  id: string;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  @ApiProperty({ description: '用户信息', required: false })
  user?: {
    id: string;
    username: string;
    nickname?: string;
    avatar?: string;
  };
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ description: '数据列表' })
  list: T[];

  @ApiProperty({ description: '总记录数' })
  total: number;

  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  limit: number;
}
