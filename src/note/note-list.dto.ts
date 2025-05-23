import { ApiProperty } from '@nestjs/swagger';
import { NoteType } from './note.entity';

export class NoteListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: NoteType })
  type: NoteType;

  @ApiProperty()
  title: string;

  @ApiProperty()
  event: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
