import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType } from '../entities/quiz-question.entity';

export class QuizOptionDto {
  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty()
  @IsBoolean()
  isCorrect: boolean;

  @ApiProperty()
  @IsInt()
  @Min(0)
  order: number;
}

export class QuizQuestionDto {
  @ApiProperty()
  @IsString()
  question: string;

  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiProperty()
  @IsInt()
  @Min(0)
  points: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  explanation?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  referenceAnswer?: string;

  @ApiProperty({ type: [QuizOptionDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizOptionDto)
  @IsOptional()
  options?: QuizOptionDto[];
}

export class CreateQuizDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: [QuizQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  questions: QuizQuestionDto[];
}

export class UpdateQuizDto extends CreateQuizDto {
  @ApiProperty()
  @IsBoolean()
  isPublished: boolean;
} 