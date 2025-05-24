import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TaskGroup } from './task-group.entity';
import { TaskType } from './task-query.dto';
import { Reward } from '../reward/reward.entity';

@Entity()
export class TaskItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  icon: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  taskGroupId: string;

  @ManyToOne(() => TaskGroup, { nullable: true })
  @JoinColumn({ name: 'taskGroupId' })
  taskGroup?: TaskGroup;

  @Column({
    type: 'varchar',
    default: TaskType.CUSTOM,
  })
  type: TaskType;

  @Column({ type: 'json', nullable: true })
  params: Record<string, any>;

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

  @Column('simple-array', { nullable: true })
  prerequisites: string[];

  @Column({
    type: 'varchar',
    length: 4096,
    nullable: true,
    comment: '奖励配置（JSON格式）',
  })
  rewards: string | null;

  @Column({ nullable: true })
  rewardId: string;

  @ManyToOne(() => Reward, { nullable: true })
  @JoinColumn({ name: 'rewardId' })
  reward?: Reward;

  @Column({ type: 'datetime', nullable: true })
  dueDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
