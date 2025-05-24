import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsNumber, IsArray } from 'class-validator';

export class LlmParamsDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  temperature?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  maxTokens?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  topP?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  frequencyPenalty?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  presencePenalty?: number;

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsOptional()
  stop?: string[];
}

export class CreateAgentDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false, type: LlmParamsDto })
  @IsObject()
  @IsOptional()
  llmParams?: LlmParamsDto;
}

export class UpdateAgentDto extends CreateAgentDto {} 