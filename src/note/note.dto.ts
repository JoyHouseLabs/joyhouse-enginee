import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsArray, IsInt } from 'class-validator';

export class NoteDto {
  @ApiProperty()
  @IsString()
  id: string;

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

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  can_comment?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  watchers?: string[];

  @ApiProperty()
  @IsOptional()
  createdAt: Date;

  @ApiProperty()
  @IsOptional()
  updatedAt: Date;

  @ApiProperty()
  @IsInt()
  selfViewTimes: number;

  @ApiProperty()
  @IsInt()
  otherViewTimes: number;
}
