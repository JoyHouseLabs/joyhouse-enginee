import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('app')
export class App {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  icon: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  url: string;

  @Column({ nullable: true })
  routerPath: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  priceCny: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  priceUsd: number;

  @Column()
  userId: string;

  @Column({ type: 'boolean', default: false })
  recommand: boolean;

  @Column({ type: 'boolean', default: false })
  isMiniapp: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 