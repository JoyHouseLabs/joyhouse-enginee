import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class NoteDeleteDto {
  @ApiProperty({ description: '要删除的笔记 ID' })
  @IsString()
  @IsNotEmpty()
  id: string;
} 