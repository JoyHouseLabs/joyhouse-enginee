import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

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

  @Column({ type: 'varchar', length: 64 })
  user_id: string;
}
