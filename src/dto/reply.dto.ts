import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class ReplyCreateDto {
  @ApiProperty() @IsString() target: string;
  @ApiProperty() @IsString() targetId: string;
  @ApiProperty() @IsString() content: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mentionUserId?: string;
}

export class ReplyUpdateDto {
  @ApiProperty() @IsString() id: string;
  @ApiPropertyOptional() @IsOptional() @IsString() content?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mentionUserId?: string;
}
