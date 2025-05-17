import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, LoginResponseDto, WalletSignatureLoginDto } from '../dto/auth.dto';
import { UserDto } from './user.dto';
import { StorageService } from '../storage/storage.service';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly storageService: StorageService
  ) {}

  @Post('register')
  @ApiResponse({ status: 201, type: UserDto, description: '注册成功' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiResponse({ status: 200, type: LoginResponseDto, description: '登录成功，返回token和用户信息' })
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);
    // 检查并创建用户目录
    await this.ensureUserDirectories(result.user.id);
    return result;
  }

  @Post('wallet-signature-login')
  @ApiResponse({ status: 200, type: LoginResponseDto, description: '签名登录成功，返回token和用户信息' })
  async walletSignatureLogin(@Body() dto: WalletSignatureLoginDto) {
    const result = await this.authService.walletSignatureLogin(dto);
    // 检查并创建用户目录
    await this.ensureUserDirectories(result.user.id);
    return result;
  }

  // 确保用户目录存在
  private async ensureUserDirectories(userId: string) {
    try {
      // 检查home目录
      const homeDir = await this.storageService.findDirByUserIdAndName(userId, 'home');
      if (!homeDir) {
        await this.storageService.createDir({
          user_id: userId,
          name: 'home',
          parent: ''
        });
      }

      // 检查share目录
      const shareDir = await this.storageService.findDirByUserIdAndName(userId, 'share');
      if (!shareDir) {
        await this.storageService.createDir({
          user_id: userId,
          name: 'share',
          parent: ''
        });
      }
    } catch (error) {
      console.error('创建用户目录失败:', error);
    }
  }
}
