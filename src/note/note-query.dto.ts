import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { NoteType } from './note.entity';

export class NoteQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;

  @ApiPropertyOptional({ description: '按标题模糊查询' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '按内容模糊查询' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: '按笔记类型筛选', enum: NoteType })
  @IsOptional()
  @IsEnum(NoteType)
  type?: NoteType;
}
