import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

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
  user_id: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  storage_dir_id?: string;

  @CreateDateColumn()
  createdAt: Date;
}
