import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../user/user.entity';
import { Agent } from './agent.entity';
import { ConversationHistory } from './conversation-history.entity';

@Entity('conversation')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Agent, (agent) => agent.conversations)
  agent: Agent;

  @OneToMany(() => ConversationHistory, (history) => history.conversation)
  history: ConversationHistory[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
