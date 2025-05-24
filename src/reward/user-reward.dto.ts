import { ApiProperty } from '@nestjs/swagger';
import { RewardType } from './reward.entity';

export class UserRewardDto {
  @ApiProperty({ description: '用户奖励ID' })
  id: string;

  @ApiProperty({ description: '用户ID' })
  user_id: string;

  @ApiProperty({ description: '奖励ID' })
  reward_id: string;

  @ApiProperty({ 
    description: '奖励类型',
    enum: RewardType,
    example: RewardType.POINTS
  })
  type: RewardType;

  @ApiProperty({ description: '奖励数量' })
  amount: number;

  @ApiProperty({ description: '奖励原因', required: false })
  reason?: string;

  @ApiProperty({ description: '关联的任务ID', required: false })
  task_id?: string;

  @ApiProperty({ 
    description: '额外参数（JSON格式）',
    required: false
  })
  params?: Record<string, any>;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '用户信息', required: false })
  user?: {
    id: string;
    username: string;
    nickname?: string;
    avatar?: string;
  };

  @ApiProperty({ description: '奖励信息', required: false })
  reward?: {
    id: string;
    name: string;
    icon?: string;
    type: RewardType;
  };
}

export class CreateUserRewardDto {
  @ApiProperty({ description: '用户ID' })
  user_id: string;

  @ApiProperty({ description: '奖励ID' })
  reward_id: string;

  @ApiProperty({ 
    description: '奖励类型',
    enum: RewardType,
    example: RewardType.POINTS
  })
  type: RewardType;

  @ApiProperty({ description: '奖励数量' })
  amount: number;

  @ApiProperty({ description: '奖励原因', required: false })
  reason?: string;

  @ApiProperty({ description: '关联的任务ID', required: false })
  task_id?: string;

  @ApiProperty({ 
    description: '额外参数（JSON格式）',
    required: false
  })
  params?: Record<string, any>;
}

export class UserRewardQueryDto {
  @ApiProperty({ description: '页码', default: '1' })
  page?: string = '1';

  @ApiProperty({ description: '每页数量', default: '20' })
  limit?: string = '20';

  @ApiProperty({ description: '奖励类型', required: false })
  type?: RewardType;

  @ApiProperty({ description: '关联的任务ID', required: false })
  task_id?: string;
} 