import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class NoteUpdateDto {
  @ApiProperty({ description: '要更新的笔记ID' })
  @IsString()
  id: string;

  @ApiPropertyOptional({ description: '事件内容' })
  @IsOptional()
  @IsString()
  event?: string;

  @ApiPropertyOptional({ description: '标题' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '内容' })
  @IsOptional()
  @IsString()
  content?: string;
}
