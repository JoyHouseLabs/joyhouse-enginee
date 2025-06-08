import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  Length,
  IsBoolean,
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

  @IsOptional()
  @IsString()
  voice?: string;

  @IsNumber()
  @Min(1)
  minutes: number;

  @IsEnum(MeditationLevel)
  level: MeditationLevel;

  @IsOptional()
  @IsBoolean()
  loop?: boolean;

  @IsOptional()
  @IsBoolean({
    message: '是否公开必须是布尔值'
  })
  isPublic?: boolean;
}
