import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('permission')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  role_id: string;

  @Column()
  controller: string;

  @Column()
  method: string;
}
