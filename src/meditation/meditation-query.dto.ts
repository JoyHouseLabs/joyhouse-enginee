import { IsString, IsEnum, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { MeditationLevel } from './meditation.entity';

export class MeditationQueryDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsEnum(MeditationLevel)
  @IsOptional()
  level?: MeditationLevel;

  @IsString()
  @IsOptional()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  pageSize?: number;
}
