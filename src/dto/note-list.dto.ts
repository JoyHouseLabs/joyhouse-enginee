import { ApiProperty } from '@nestjs/swagger';

export class NoteListItemDto {
  @ApiProperty() id: string;
  @ApiProperty({ required: false }) event?: string;
  @ApiProperty({ required: false }) title?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
