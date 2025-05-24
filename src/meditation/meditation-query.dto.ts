import { IsString, IsEnum, IsOptional } from 'class-validator';
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
}
