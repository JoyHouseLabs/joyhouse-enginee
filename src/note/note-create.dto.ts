import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
} from 'class-validator';
import { NoteType } from './note.entity';

export class NoteCreateDto {
  @ApiPropertyOptional({ enum: NoteType, default: NoteType.REGULAR })
  @IsOptional()
  @IsEnum(NoteType)
  type?: NoteType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  event?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feelings?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defense?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  analysis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  who_can_see?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  can_comment?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  watchers?: string[];
}
