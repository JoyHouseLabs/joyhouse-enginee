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

  @ApiProperty({ description: '来源类型 (pc, api, app, etc.)', required: false })
  @IsString()
  @IsOptional()
  sourceType?: string;
}

export class LoginDto {
  @ApiProperty({ description: '用户名' })
  @IsString()
  username: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  password: string;
}





export class SetUserPropertyDto {
  @ApiProperty({ description: 'key', required: false })
  @IsOptional()
  @IsString()
  key?: string;

  @ApiProperty({ description: 'value', required: false })
  @IsOptional()
  @IsString()
  value?: string;
  @ApiProperty({ description: '是否完成首次登录', required: false })
  @IsOptional()
  onboarded?: boolean;
}

export class ChangePasswordDto {
  @ApiProperty({ description: '旧密码' })
  @IsString()
  oldPassword: string;

  @ApiProperty({ description: '新密码' })
  @IsString()
  newPassword: string;
}

export class WalletSignatureSetPasswordDto {
  @ApiProperty({ description: '钱包地址' })
  @IsString()
  address: string;

  @ApiProperty({
    description: '主链类型',
    enum: ['evm', 'sol'],
    example: 'evm',
  })
  @IsString()
  mainchain: 'evm' | 'sol';

  @ApiProperty({ description: '签名消息' })
  @IsString()
  message: string;

  @ApiProperty({ description: '签名内容' })
  @IsString()
  sign: string;

  @ApiProperty({ description: '时间戳' })
  ts: number | string;

  @ApiProperty({ description: '新密码' })
  @IsString()
  newPassword: string;
}

export class WalletSignatureLoginDto {
  @ApiProperty({ description: '钱包地址' })
  @IsString()
  address: string;

  @ApiProperty({
    description: '主链类型',
    enum: ['evm', 'sol'],
    example: 'evm',
  })
  @IsString()
  mainchain: 'evm' | 'sol';

  @ApiProperty({ description: '签名消息' })
  @IsString()
  message: string;

  @ApiProperty({ description: '签名内容' })
  @IsString()
  sign: string;

  @ApiProperty({ description: '时间戳' })
  ts: number | string;
}

export class LoginResponseDto {
  @ApiProperty() token: string;
  @ApiProperty() user: any; // 可用 UserDto 替换
}
