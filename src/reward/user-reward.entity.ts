import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { Reward, RewardType } from './reward.entity';

@Entity()
export class UserReward {
  @PrimaryColumn()
  id: string;

  @Column()
  user_id: string;

  @Column()
  reward_id: string;

  @Column({ type: 'float' })
  amount: number;

  @Column({
    type: 'varchar',
    default: RewardType.POINTS,
  })
  type: RewardType;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'text', nullable: true })
  task_id: string | null;

  @Column({ type: 'json', nullable: true })
  params: Record<string, any> | null;

  @Column()
  createdAt: Date;

  @Column()
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Reward)
  @JoinColumn({ name: 'reward_id' })
  reward: Reward;
}
