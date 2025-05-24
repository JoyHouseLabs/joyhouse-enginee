import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  Length,
} from 'class-validator';
import { MeditationLevel } from './meditation.entity';

export class CreateMeditationDto {
  @IsString()
  @Length(1, 100)
  name: string;

  @IsString()
  @Length(1, 350)
  @IsOptional()
  icon?: string;

  @IsString()
  description: string;

  @IsString()
  voice: string;

  @IsNumber()
  @Min(1)
  minutes: number;

  @IsEnum(MeditationLevel)
  level: MeditationLevel;
}
