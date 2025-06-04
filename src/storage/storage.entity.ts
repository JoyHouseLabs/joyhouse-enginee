import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('storage')
export class Storage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  filename: string;

  @Column({ type: 'varchar', length: 255 })
  filepath: string;

  @Column({ type: 'varchar', length: 255 })
  filetype: string;

  @Column({ type: 'bigint' })
  filesize: number;

  @Column({ type: 'varchar', length: 255 })
  url: string;

  @Column({ type: 'varchar', length: 64 })
  userId: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  storage_dir_id?: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'simple-array', nullable: true })
  sharedWith?: string[]; // 共享给的用户ID列表

  @Column({ type: 'simple-json', nullable: true })
  sharePermissions?: {
    userId: string;
    permission: 'read' | 'write' | 'admin';
  }[];

  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  previewUrl?: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    thumbnail?: string;
    [key: string]: any;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
