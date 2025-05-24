import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TaskItem } from './task-item.entity';
import { Reward } from '../reward/reward.entity';

@Entity()
export class TaskGroup {
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
    length: 4096,
    nullable: true,
    comment: 'JSON格式的额外参数',
  })
  params: string | null;

  @Column({
    type: 'boolean',
    default: true,
    comment: '是否启用',
  })
  isActive: boolean;

  @Column({
    type: 'int',
    default: 0,
    comment: '排序权重，数字越大越靠前',
  })
  weight: number;

  @Column({
    type: 'varchar',
    length: 4096,
    nullable: true,
    comment: '触发条件（JSON格式）',
  })
  trigger: string | null;

  @Column({
    type: 'varchar',
    length: 4096,
    nullable: true,
    comment: '奖励配置（JSON格式）',
  })
  rewards: string | null;

  @Column({ nullable: true })
  rewardId?: string;

  @ManyToOne(() => Reward, { nullable: true })
  @JoinColumn({ name: 'rewardId' })
  reward?: Reward;

  @Column({
    type: 'boolean',
    default: false,
    comment: '是否需要在所有任务完成后才发放奖励',
  })
  requireAllTasksCompleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => TaskItem, (taskItem) => taskItem.taskGroup)
  taskItems: TaskItem[];
}
