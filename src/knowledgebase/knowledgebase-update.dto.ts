import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class KnowledgebaseUpdateDto {
  @ApiProperty() @IsString() id: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() icon?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() typicalQuery?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableLlmParser?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() prompt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() embedding?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() embeddingModel?: string;
}
