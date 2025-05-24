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

export enum DocumentType {
  REQUIREMENT = 'requirement',
  PLAN = 'plan',
  RESULT = 'result',
  EVALUATION = 'evaluation',
  ATTACHMENT = 'attachment',
  REFERENCE = 'reference',
}

export enum DocumentStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
}

@Entity('collaboration_document')
export class CollaborationDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'varchar',
    enum: DocumentType,
  })
  type: DocumentType;

  @Column({
    type: 'varchar',
    enum: DocumentStatus,
    default: DocumentStatus.DRAFT,
  })
  status: DocumentStatus;

  @Column()
  fileName: string;

  @Column()
  filePath: string;

  @Column()
  mimeType: string;

  @Column({ type: 'bigint' })
  fileSize: number;

  @Column({ nullable: true })
  fileHash?: string;

  @ManyToOne(() => CollaborationRoom, (room) => room.documents)
  room: CollaborationRoom;

  @ManyToOne(() => CollaborationTask, { nullable: true })
  relatedTask?: CollaborationTask;

  @ManyToOne(() => User, { nullable: true })
  uploadedBy?: User;

  @ManyToOne(() => Agent, { nullable: true })
  generatedBy?: Agent;

  @Column({ type: 'json', nullable: true })
  metadata?: {
    version?: string;
    tags?: string[];
    category?: string;
    isPublic?: boolean;
    downloadCount?: number;
    lastAccessedAt?: Date;
    expiresAt?: Date;
    thumbnailUrl?: string;
    previewUrl?: string;
  };

  @Column({ type: 'json', nullable: true })
  permissions?: {
    canView?: string[];
    canEdit?: string[];
    canDelete?: string[];
    canDownload?: string[];
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
