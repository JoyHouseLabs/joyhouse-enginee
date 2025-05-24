import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('reply')
export class Reply {
  @ApiProperty() @PrimaryGeneratedColumn('uuid') id: string;
  @ApiProperty() @Column({ type: 'varchar', length: 26 }) userId: string;
  @ApiProperty() @Column({ type: 'varchar', length: 32 }) target: string;
  @ApiProperty() @Column({ type: 'varchar', length: 64 }) targetId: string;
  @ApiProperty() @Column({ type: 'text' }) content: string;
  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 26, nullable: true })
  mentionUserId?: string;
  @ApiProperty() @Column({ type: 'datetime' }) createdAt: Date;
  @ApiProperty() @Column({ type: 'datetime' }) updatedAt: Date;
}
