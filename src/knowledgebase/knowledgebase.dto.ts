import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class KnowledgebaseDto {
  @ApiProperty() @IsString() id: string;
  @ApiProperty() @IsString() userId: string;
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() icon?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() typicalQuery?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableLlmParser?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() prompt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() embedding?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() embeddingModel?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
