import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, LoginResponseDto, WalletSignatureLoginDto } from '../dto/auth.dto';
import { UserDto } from './user.dto';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiResponse({ status: 201, type: UserDto, description: '注册成功' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiResponse({ status: 200, type: LoginResponseDto, description: '登录成功，返回token和用户信息' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('wallet-signature-login')
  @ApiResponse({ status: 200, type: LoginResponseDto, description: '签名登录成功，返回token和用户信息' })
  async walletSignatureLogin(@Body() dto: WalletSignatureLoginDto) {
    return this.authService.walletSignatureLogin(dto);
  }
}
