import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class NoteCreateDto {
  @ApiPropertyOptional({ description: '标题' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: '内容' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: '笔记事件' })
  @IsOptional()
  @IsString()
  event?: string;

  @ApiPropertyOptional({ description: '笔记感受' })
  @IsOptional()
  @IsString()
  feelings?: string;

  @ApiPropertyOptional({ description: '笔记防御' })
  @IsOptional()
  @IsString()
  defense?: string;

  @ApiPropertyOptional({ description: '笔记分析' })
  @IsOptional()
  @IsString()
  analysis?: string;
}
