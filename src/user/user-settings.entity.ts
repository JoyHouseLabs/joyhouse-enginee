import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export type ThemeType = 'light' | 'dark';
export type FontType = 'sans' | 'serif' | 'mono';

export interface NotionStyle {
  theme: ThemeType;
  font: FontType;
  smallText: boolean;
}

export interface ModelSettings {
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

export interface UsageLimits {
  monthlyTokens: number;
  monthlyCost: number;
  autoPaymentLimit: number;
}

@Entity('user_settings')
export class UserSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('jsonb', { default: {
    theme: 'light',
    font: 'sans',
    smallText: false
  }})
  notionStyle: NotionStyle;

  @Column('jsonb', { default: {
    defaultModel: '',
    temperature: 0.7,
    maxTokens: 2000,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0
  }})
  modelSettings: ModelSettings;

  @Column('jsonb', { default: {
    monthlyTokens: 1000000,
    monthlyCost: 100,
    autoPaymentLimit: 50
  }})
  usageLimits: UsageLimits;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
} 