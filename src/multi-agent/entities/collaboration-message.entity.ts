import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../../user/user.entity';
import { Agent } from '../../agent/entities/agent.entity';
import { CollaborationRoom } from './collaboration-room.entity';
import { CollaborationTask } from './collaboration-task.entity';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system',
  REQUIREMENT = 'requirement',
  PLAN = 'plan',
  RESULT = 'result',
  EVALUATION = 'evaluation',
  MENTION = 'mention',
  APPROVAL_REQUEST = 'approval_request',
  APPROVAL_RESPONSE = 'approval_response',
}

export enum SenderType {
  USER = 'user',
  AGENT = 'agent',
  SYSTEM = 'system',
}

@Entity('collaboration_message')
export class CollaborationMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'varchar',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Column({
    type: 'varchar',
    enum: SenderType,
  })
  senderType: SenderType;

  @ManyToOne(() => CollaborationRoom, (room) => room.messages)
  room: CollaborationRoom;

  @ManyToOne(() => User, { nullable: true })
  user?: User;

  @ManyToOne(() => Agent, { nullable: true })
  agent?: Agent;

  @ManyToOne(() => CollaborationTask, { nullable: true })
  relatedTask?: CollaborationTask;

  @Column({ type: 'json', nullable: true })
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    size: number;
    mimeType: string;
  }>;

  @Column({ type: 'json', nullable: true })
  mentions?: Array<{
    type: 'user' | 'agent';
    id: string;
    name: string;
  }>;

  @Column({ type: 'json', nullable: true })
  metadata?: {
    isApprovalRequest?: boolean;
    approvalId?: string;
    requiresResponse?: boolean;
    responseDeadline?: Date;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    tags?: string[];
    threadId?: string;
    replyToId?: string;
  };

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'boolean', default: false })
  isImportant: boolean;

  @Column({ type: 'timestamp', nullable: true })
  editedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  readAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
