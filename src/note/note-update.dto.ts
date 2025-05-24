import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsInt,
  IsEnum,
} from 'class-validator';
import { NoteType } from './note.entity';

export class NoteUpdateDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiPropertyOptional({ enum: NoteType })
  @IsOptional()
  @IsEnum(NoteType)
  type?: NoteType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  selfViewTimes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  otherViewTimes?: number;
}
