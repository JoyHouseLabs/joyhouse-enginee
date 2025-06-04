import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UserDto {
  @ApiProperty({ description: '用户ID' })
  id: string;

  @ApiProperty({ description: '用户名' })
  username: string;

  @ApiProperty({ description: '昵称', required: false })
  nickname?: string;

  @ApiProperty({ description: '头像', required: false })
  avatar?: string;

  @ApiProperty({ description: '是否已完成引导', required: false })
  onboarded?: boolean;

  @ApiProperty({ description: '备注', required: false })
  remark?: string;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

export class UpdateUserDto {
  @ApiProperty({ description: '昵称', required: false })
  @IsString()
  @IsOptional()
  nickname?: string;

  @ApiProperty({ description: '头像', required: false })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({ description: '是否已完成引导', required: false })
  @IsBoolean()
  @IsOptional()
  onboarded?: boolean;

  @ApiProperty({ description: '备注', required: false })
  @IsString()
  @IsOptional()
  remark?: string;

  @ApiProperty({ description: 'home_dir_id', required: false })
  @IsString()
  @IsOptional()
  home_dir_id?: string;

  @ApiProperty({ description: 'share_dir_id', required: false })
  @IsString()
  @IsOptional()
  share_dir_id?: string;

  @ApiProperty({ description: 'auto_extract_content', required: false })
  @IsBoolean()
  @IsOptional()
  auto_extract_content?: boolean;
}

export class UserQueryDto {
  @ApiProperty({ description: '页码', required: false, default: 1 })
  @IsOptional()
  page?: number;

  @ApiProperty({ description: '每页数量', required: false, default: 10 })
  @IsOptional()
  limit?: number;
}

export class UserListResponseDto {
  @ApiProperty({ description: '用户列表', type: [UserDto] })
  list: UserDto[];

  @ApiProperty({ description: '总数' })
  total: number;

  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  limit: number;
}
