import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { TaskStatus, TaskType } from './task-query.dto';

@Entity()
export class Task {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  icon: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  userId: string;

  @Column({
    type: 'varchar',
    default: TaskStatus.PENDING,
  })
  status: TaskStatus;

  @Column({ type: 'float', default: 0 })
  progress: number;

  @Column({
    type: 'varchar',
    default: TaskType.CUSTOM,
  })
  type: TaskType;

  @Column({ type: 'json', nullable: true })
  params: Record<string, any>;

  @Column({ nullable: true })
  rewardId: string;

  @Column()
  taskGroupId: string;

  @Column({ type: 'timestamp', nullable: true })
  dueDate?: Date;

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column()
  createdAt: Date;

  @Column()
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
