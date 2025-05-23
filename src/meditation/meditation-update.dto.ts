import { IsString, IsNumber, IsEnum, IsOptional, Min, Length, IsBoolean } from 'class-validator'
import { MeditationLevel } from './meditation.entity'

export class UpdateMeditationDto {
  @IsString()
  @Length(1, 100)
  @IsOptional()
  name?: string

  @IsString()
  @Length(1, 350)
  @IsOptional()
  icon?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsString()
  @IsOptional()
  voice?: string

  @IsNumber()
  @Min(1)
  @IsOptional()
  minutes?: number

  @IsEnum(MeditationLevel)
  @IsOptional()
  level?: MeditationLevel

  @IsString()
  @IsOptional()
  userId?: string

  @IsBoolean()
  @IsOptional()
  loop?: boolean
} 