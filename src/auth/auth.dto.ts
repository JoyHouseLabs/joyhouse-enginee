import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ description: '用户名' })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: '昵称', required: false })
  @IsString()
  @IsOptional()
  nickname?: string;
}

export class LoginDto {
  @ApiProperty({ description: '用户名' })
  @IsString()
  username: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  password: string;
}
