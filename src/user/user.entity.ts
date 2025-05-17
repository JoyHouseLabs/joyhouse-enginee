import { Entity, PrimaryColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class User {
  @ApiProperty() @PrimaryColumn({ type: 'varchar', length: 26 }) id: string;
  @ApiProperty() @Column({ type: 'varchar', length: 64, unique: true }) username: string;
  @ApiProperty() @Column({ type: 'varchar', length: 128 }) password: string;
  @ApiProperty({ required: false }) @Column({ type: 'varchar', length: 64, nullable: true }) nickname?: string;
  @ApiProperty({ required: false }) @Column({ type: 'varchar', length: 255, nullable: true }) avatar?: string;
  @ApiProperty({ required: false }) @Column({ type: 'varchar', length: 255, nullable: true }) remark?: string;
  @ApiProperty({ description: '是否已完成首次登录', default: false })
  @Column({ type: 'boolean', default: false })
  onboarded: boolean;

  @ApiProperty({ description: '是否为管理员', default: false })
  @Column({ type: 'boolean', default: false })
  isAdmin: boolean;
  @ApiProperty() @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @ApiProperty() @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' }) updatedAt: Date;
}
