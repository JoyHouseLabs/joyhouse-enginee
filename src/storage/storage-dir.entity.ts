import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('storage_dir')
export class StorageDir {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  parent?: string;

  @Column({ type: 'simple-array', nullable: true })
  roleIds?: string[];

  @Column({ type: 'simple-array', nullable: true })
  sharedWith?: string[]; // 共享给的用户ID列表

  @Column({ type: 'simple-json', nullable: true })
  sharePermissions?: {
    userId: string;
    permission: 'read' | 'write' | 'admin';
  }[];

  @Column({ type: 'varchar', length: 64 })
  userId: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  icon?: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  color?: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
