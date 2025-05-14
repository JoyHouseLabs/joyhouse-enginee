import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ReplyQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() target?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() targetId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() content?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mentionUserId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() userId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() page?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() pageSize?: number;
}
