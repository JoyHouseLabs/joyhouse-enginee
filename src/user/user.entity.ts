import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { RoleType } from '../role/role.entity';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  nickname?: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ type: 'varchar', default: RoleType.USER })
  role: RoleType;

  @Column({ default: false })
  isAdmin: boolean;

  @Column({ default: false })
  onboarded: boolean;

  @Column({ nullable: true })
  remark?: string;

  @Column({ nullable: true })
  home_dir_id: string;

  @Column({ nullable: true })
  share_dir_id: string;

  @Column({ default: true })
  auto_extract_content: boolean;

  @ApiProperty({ description: '注册IP' })
  @Column({ nullable: true })
  registerIp?: string;

  @ApiProperty({ description: '来源类型 (pc, api, app, etc.)' })
  @Column({ nullable: true })
  sourceType?: string;

  @ApiProperty({ description: '交易密码' })
  @Column({ nullable: true })
  tradePassword?: string;

  @ApiProperty({ description: '最后登录IP' })
  @Column({ nullable: true })
  lastLoginIp?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
