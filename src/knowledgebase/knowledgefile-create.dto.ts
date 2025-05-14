import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber } from 'class-validator';

export class KnowledgefileCreateDto {
  @ApiProperty() @IsString() knowledgebaseId: string;
  @ApiProperty() @IsString() filename: string;
  @ApiProperty() @IsString() filepath: string;
  @ApiProperty() @IsNumber() filesize: number;
  @ApiProperty() @IsString() url: string;
}
