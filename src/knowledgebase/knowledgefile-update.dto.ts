import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class KnowledgefileUpdateDto {
  @ApiProperty() @IsString() id: string;
  @ApiPropertyOptional() @IsOptional() @IsString() filename?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() filepath?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() filesize?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() url?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}
