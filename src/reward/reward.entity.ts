import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum RewardType {
  POINTS = 'POINTS', // 积分
  COINS = 'COINS', // 金币
  DIAMONDS = 'DIAMONDS', // 钻石
  CUSTOM = 'CUSTOM', // 自定义奖励
}

@Entity()
export class Reward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  icon: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'varchar',
    default: RewardType.POINTS,
  })
  type: RewardType;

  @Column({
    type: 'int',
    default: 0,
    comment: '奖励数量',
  })
  amount: number;

  @Column({
    type: 'boolean',
    default: true,
    comment: '是否启用',
  })
  isActive: boolean;

  @Column({ type: 'json', nullable: true })
  params: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
