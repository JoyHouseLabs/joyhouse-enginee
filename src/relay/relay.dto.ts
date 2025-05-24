import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt } from 'class-validator';

export class CreateRelayDto {
  @ApiProperty()
  @IsString()
  host: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  memo?: string;

  @ApiProperty()
  @IsString()
  status: string;
}

export class UpdateRelayDto {
  @ApiProperty()
  @IsString()
  id: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  host?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  useDomain?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  memo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}
