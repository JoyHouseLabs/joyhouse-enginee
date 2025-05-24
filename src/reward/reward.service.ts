import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Reward } from './reward.entity';
import { UserReward } from './user-reward.entity';
import { CreateRewardDto, UpdateRewardDto, RewardQueryDto, RewardDto } from './reward.dto';
import { CreateUserRewardDto, UserRewardDto } from './user-reward.dto';

@Injectable()
export class RewardService {
  constructor(
    @InjectRepository(Reward)
    private readonly rewardRepo: Repository<Reward>,
    @InjectRepository(UserReward)
    private readonly userRewardRepo: Repository<UserReward>,
  ) {}

  private toRewardDto(reward: Reward): RewardDto {
    return {
      id: reward.id,
      name: reward.name,
      icon: reward.icon,
      description: reward.description,
      type: reward.type,
      amount: reward.amount,
      isActive: reward.isActive,
      params: reward.params || undefined,
      createdAt: reward.createdAt,
      updatedAt: reward.updatedAt,
    };
  }

  private toUserRewardDto(userReward: UserReward): UserRewardDto {
    return {
      id: userReward.id,
      user_id: userReward.user_id,
      reward_id: userReward.reward_id,
      type: userReward.type,
      amount: userReward.amount,
      reason: userReward.reason || undefined,
      task_id: userReward.task_id || undefined,
      params: userReward.params || undefined,
      createdAt: userReward.createdAt,
      user: userReward.user
        ? {
            id: userReward.user.id,
            username: userReward.user.username,
            nickname: userReward.user.nickname,
            avatar: userReward.user.avatar,
          }
        : undefined,
      reward: userReward.reward
        ? {
            id: userReward.reward.id,
            name: userReward.reward.name,
            icon: userReward.reward.icon,
            type: userReward.reward.type,
          }
        : undefined,
    };
  }

  async create(dto: CreateRewardDto): Promise<RewardDto> {
    const reward = this.rewardRepo.create({
      ...dto,
      params: dto.params || null,
    });
    const saved = await this.rewardRepo.save(reward);
    return this.toRewardDto(saved);
  }

  async findAll(query: RewardQueryDto): Promise<{ list: RewardDto[]; total: number; page: number; limit: number }> {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    
    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
      throw new Error('Invalid page or limit parameters');
    }

    const where: any = {};
    if (query.name) {
      where.name = Like(`%${query.name}%`);
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [rewards, total] = await this.rewardRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      list: rewards.map(reward => this.toRewardDto(reward)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<RewardDto> {
    const reward = await this.rewardRepo.findOne({ where: { id } });
    if (!reward) {
      throw new Error('Reward not found');
    }
    return this.toRewardDto(reward);
  }

  async update(dto: UpdateRewardDto): Promise<RewardDto> {
    const reward = await this.rewardRepo.findOne({ where: { id: dto.id } });
    if (!reward) {
      throw new Error('Reward not found');
    }

    if (dto.params !== undefined) {
      reward.params = dto.params || null;
    }
    Object.assign(reward, {
      ...dto,
      params: undefined,
    });

    const saved = await this.rewardRepo.save(reward);
    return this.toRewardDto(saved);
  }

  async remove(id: string): Promise<void> {
    const reward = await this.rewardRepo.findOne({ where: { id } });
    if (reward) {
      await this.rewardRepo.remove(reward);
    }
  }

  async grantReward(dto: CreateUserRewardDto): Promise<UserRewardDto> {
    // 验证奖励是否存在且启用
    const reward = await this.rewardRepo.findOne({ where: { id: dto.reward_id } });
    if (!reward) {
      throw new Error('Reward not found');
    }
    if (!reward.isActive) {
      throw new Error('Reward is not active');
    }

    // 创建用户奖励记录
    const userReward = new UserReward();
    userReward.id = (await import('ulid')).ulid();
    userReward.user_id = dto.user_id;
    userReward.reward_id = dto.reward_id;
    userReward.type = dto.type;
    userReward.amount = dto.amount;
    userReward.reason = dto.reason || null;
    userReward.task_id = dto.task_id || null;
    userReward.params = dto.params || null;
    userReward.createdAt = new Date();
    userReward.updatedAt = new Date();

    const saved = await this.userRewardRepo.save(userReward);
    return this.toUserRewardDto(saved);
  }

  async getUserRewards(userId: string, query: { page?: string; limit?: string; type?: string; task_id?: string }): Promise<{ list: UserRewardDto[]; total: number; page: number; limit: number }> {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    
    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
      throw new Error('Invalid page or limit parameters');
    }

    const where: any = { user_id: userId };
    if (query.type) {
      where.type = query.type;
    }
    if (query.task_id) {
      where.task_id = query.task_id;
    }

    const [userRewards, total] = await this.userRewardRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['user', 'reward'],
    });

    return {
      list: userRewards.map(userReward => this.toUserRewardDto(userReward)),
      total,
      page,
      limit,
    };
  }
} 