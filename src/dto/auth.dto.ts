import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, IsOptional } from 'class-validator';

export class RegisterDto {
  @ApiProperty()
  @IsString()
  @Length(3, 32)
  username: string;

  @ApiProperty()
  @IsString()
  @Length(6, 64)
  password: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nickname?: string;
}

export class LoginDto {
  @ApiProperty()
  @IsString()
  username: string;

  @ApiProperty()
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

  @ApiProperty({ description: '主链类型', enum: ['evm', 'sol'], example: 'evm' })
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

  @ApiProperty({ description: '主链类型', enum: ['evm', 'sol'], example: 'evm' })
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
