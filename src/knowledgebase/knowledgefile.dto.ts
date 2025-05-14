import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber } from 'class-validator';

export class KnowledgefileDto {
  @ApiProperty() @IsString() id: string;
  @ApiProperty() @IsString() knowledgebaseId: string;
  @ApiProperty() @IsString() userId: string;
  @ApiProperty() @IsString() filename: string;
  @ApiProperty() @IsString() filepath: string;
  @ApiProperty() @IsNumber() filesize: number;
  @ApiProperty() @IsString() url: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty() @IsString() status: string;
}
