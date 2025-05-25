import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('user_role')
export class UserRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  role_id: string;
}
