import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity()
export class Relay {
  @ApiProperty() @PrimaryGeneratedColumn('uuid') id: string;
  @ApiProperty() @Column({ type: 'varchar', length: 26 }) userId: string;
  @ApiProperty() @Column({ type: 'varchar', length: 255 }) host: string;
  @ApiProperty() @Column({ type: 'varchar', length: 255 }) name: string;
  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 1024, nullable: true })
  icon?: string;

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 1024, nullable: true })
  description?: string;
  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 4096, nullable: true })
  memo?: string;
  @ApiProperty() @Column({ type: 'varchar', length: 64 }) status: string;
  @ApiProperty()
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
  @ApiProperty()
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
