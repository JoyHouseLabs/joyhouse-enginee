import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { User } from '../../user/user.entity';
import { Agent } from '../../agent/entities/agent.entity';
import { CollaborationTask } from './collaboration-task.entity';
import { CollaborationMessage } from './collaboration-message.entity';
import { CollaborationDocument } from './collaboration-document.entity';

export enum RoomStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('collaboration_room')
export class CollaborationRoom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'varchar',
    enum: RoomStatus,
    default: RoomStatus.ACTIVE,
  })
  status: RoomStatus;

  @ManyToOne(() => User)
  creator: User;

  @ManyToMany(() => User)
  @JoinTable({
    name: 'collaboration_room_users',
    joinColumn: { name: 'room_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
  })
  participants: User[];

  @ManyToMany(() => Agent)
  @JoinTable({
    name: 'collaboration_room_agents',
    joinColumn: { name: 'room_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'agent_id', referencedColumnName: 'id' },
  })
  agents: Agent[];

  @OneToMany(() => CollaborationTask, (task) => task.room)
  tasks: CollaborationTask[];

  @OneToMany(() => CollaborationMessage, (message) => message.room)
  messages: CollaborationMessage[];

  @OneToMany(() => CollaborationDocument, (document) => document.room)
  documents: CollaborationDocument[];

  @Column({ type: 'json', nullable: true })
  settings?: {
    autoApproval?: boolean;
    requireUserConfirmation?: boolean;
    maxRetries?: number;
    evaluationThreshold?: number;
    allowedFileTypes?: string[];
    maxFileSize?: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
