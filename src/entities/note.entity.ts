import { Entity, PrimaryColumn, Column } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity()
export class Note {
  @ApiProperty() @PrimaryColumn({ type: 'varchar', length: 26 }) id: string;
  @ApiPropertyOptional() @Column({ type: 'varchar', length: 255, nullable: true }) title?: string;
  @ApiProperty() @Column({ type: 'text' }) content: string;
  @ApiPropertyOptional() @Column({ type: 'varchar', length: 4096, nullable: true }) event?: string;
  @ApiPropertyOptional() @Column({ type: 'varchar', length: 4096, nullable: true }) feelings?: string;
  @ApiPropertyOptional() @Column({ type: 'varchar', length: 4096, nullable: true }) defense?: string;
  @ApiPropertyOptional() @Column({ type: 'varchar', length: 4096, nullable: true }) analysis?: string;
  @ApiPropertyOptional() @Column({ type: 'varchar', length: 255, nullable: true }) who_can_see?: string;
  @ApiPropertyOptional() @Column({ type: 'boolean', default: true }) can_comment?: boolean;
  @ApiPropertyOptional({ type: [String] }) @Column({ type: 'simple-json', nullable: true }) watchers?: string[];
  @ApiProperty() @Column({ type: 'varchar', length: 26 }) userId: string;
  @ApiProperty() @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @ApiProperty() @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' }) updatedAt: Date;
}
