import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum RoleType {
  ADMIN = 'admin',
  USER = 'user',
}

@Entity('role')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description?: string;
}
