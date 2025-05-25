import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum SubscribeStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

@Entity('app_subscribe')
export class AppSubscribe {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  appId: string;

  @Column({ type: 'timestamp' })
  expireAt: Date;

  @Column({
    type: 'enum',
    enum: SubscribeStatus,
    default: SubscribeStatus.ACTIVE
  })
  status: SubscribeStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 