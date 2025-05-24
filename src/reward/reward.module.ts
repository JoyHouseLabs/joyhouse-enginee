import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reward } from './reward.entity';
import { UserReward } from './user-reward.entity';
import { RewardService } from './reward.service';
import { UserRewardService } from './user-reward.service';
import { RewardController } from './reward.controller';
import { RoleModule } from '../role/role.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reward, UserReward]),
    RoleModule,
  ],
  controllers: [RewardController],
  providers: [RewardService, UserRewardService],
  exports: [RewardService, UserRewardService]
})
export class RewardModule {} 