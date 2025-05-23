import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator'
import { MeditationLevel } from './meditation.entity'

export class CreateMeditationDto {
  @IsString()
  name: string

  @IsString()
  @IsOptional()
  icon?: string

  @IsString()
  description: string

  @IsString()
  voice: string

  @IsNumber()
  @Min(1)
  minutes: number

  @IsEnum(MeditationLevel)
  level: MeditationLevel
}

export class UpdateMeditationDto {
  @IsString()
  @IsOptional()
  name?: string

  @IsString()
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
}

export class MeditationQueryDto {
  @IsString()
  @IsOptional()
  userId?: string

  @IsEnum(MeditationLevel)
  @IsOptional()
  level?: MeditationLevel
} 