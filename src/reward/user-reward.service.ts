import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserReward } from './user-reward.entity';
import { Reward } from './reward.entity';

@Injectable()
export class UserRewardService {
  constructor(
    @InjectRepository(UserReward)
    private userRewardRepository: Repository<UserReward>,
    @InjectRepository(Reward)
    private rewardRepository: Repository<Reward>,
  ) {}

  async grantReward(userId: string, rewardId: string): Promise<UserReward> {
    const reward = await this.rewardRepository.findOne({ where: { id: rewardId } });
    if (!reward) {
      throw new Error('Reward not found');
    }

    const userReward = new UserReward();
    userReward.id = (await import('ulid')).ulid();
    userReward.user_id = userId;
    userReward.reward_id = rewardId;
    userReward.amount = reward.amount;
    userReward.type = reward.type;
    userReward.params = reward.params;
    userReward.createdAt = new Date();
    userReward.updatedAt = new Date();
    return this.userRewardRepository.save(userReward);
  }

  async getUserRewards(userId: string): Promise<UserReward[]> {
    return this.userRewardRepository.find({
      where: { user_id: userId },
      relations: ['reward']
    });
  }
} 