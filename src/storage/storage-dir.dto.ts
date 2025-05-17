import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateStorageDirDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  parent?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  roleIds?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  user_id: string;
}
