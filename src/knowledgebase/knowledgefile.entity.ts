import { Entity, PrimaryColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Knowledgefile {
  @ApiProperty() @PrimaryColumn({ type: 'varchar', length: 26 }) id: string;
  @ApiProperty() @Column({ type: 'varchar', length: 26 }) knowledgebaseId: string;
  @ApiProperty() @Column({ type: 'varchar', length: 26 }) userId: string;
  @ApiProperty() @Column({ type: 'varchar', length: 255 }) filename: string;
  @ApiProperty() @Column({ type: 'varchar', length: 1024 }) filepath: string;
  @ApiProperty() @Column({ type: 'bigint' }) filesize: number;
  @ApiProperty() @Column({ type: 'varchar', length: 1024 }) url: string;
  @ApiProperty() @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @ApiProperty() @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' }) updatedAt: Date;
  @ApiProperty() @Column({ type: 'varchar', length: 32, default: 'pending' }) status: string;
}
