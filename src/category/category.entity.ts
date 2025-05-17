import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('category')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  user_id: string;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  icon?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'simple-array', nullable: true })
  roleIds?: string[];

  @Column({ type: 'varchar', length: 64, nullable: true })
  parentId?: string;

  @Column({ type: 'int', default: 0 })
  fileNum: number;
}
