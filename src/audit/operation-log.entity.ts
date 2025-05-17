import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('operation_log')
export class OperationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @Column()
  action: string;

  @Column({ type: 'json', nullable: true })
  target?: any;

  @Column({ type: 'json', nullable: true })
  detail?: any;

  @CreateDateColumn()
  created_at: Date;
}
