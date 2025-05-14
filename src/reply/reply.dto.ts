import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class ReplyCreateDto {
  @ApiProperty() @IsString() target: string;
  @ApiProperty() @IsString() targetId: string;
  @ApiProperty() @IsString() content: string;
}

export class ReplyUpdateDto {
  @ApiProperty() @IsString() id: string;
}
