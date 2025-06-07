import { Entity, PrimaryColumn, Column } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum NoteType {
  REGULAR = 'regular',
  AWARENESS = 'awareness',
}

@Entity()
export class Note {
  @ApiProperty() @PrimaryColumn({ type: 'varchar', length: 26 }) id: string;
  @ApiProperty()
  @Column({ type: 'varchar', length: 20, default: NoteType.REGULAR })
  type: NoteType;
  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 255, nullable: true })
  title?: string;
  @ApiProperty() @Column({ type: 'text' }) content: string;
  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 4096, nullable: true })
  event?: string;
  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 4096, nullable: true })
  feelings?: string;
  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 4096, nullable: true })
  defense?: string;
  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 4096, nullable: true })
  analysis?: string;
  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 255, nullable: true })
  who_can_see?: string;
  @ApiPropertyOptional()
  @Column({ type: 'boolean', default: true })
  can_comment?: boolean;
  @ApiPropertyOptional({ type: [String] })
  @Column({ type: 'simple-json', nullable: true })
  watchers?: string[];
  @ApiProperty() @Column({ type: 'varchar', length: 36 }) userId: string;
  @ApiProperty()
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
  @ApiProperty()
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
  @ApiProperty() @Column({ type: 'int', default: 0 }) selfViewTimes: number;
  @ApiProperty() @Column({ type: 'int', default: 0 }) otherViewTimes: number;
}
