import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsInt } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  user_id: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  roleIds?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  fileNum?: number;
}

export class UpdateCategoryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  roleIds?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  fileNum?: number;
}
