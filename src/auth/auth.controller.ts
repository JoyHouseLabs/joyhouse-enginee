import { Controller, Post, Body, UseGuards, Get, Request, Put, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RegisterDto, LoginDto, LoginResponseDto, WalletSignatureLoginDto } from '../dto/auth.dto';
import { UserDto } from '../user/user.dto';
import { StorageService } from '../storage/storage.service';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly storageService: StorageService
  ) {}

  @Post('register')
  @ApiOperation({ summary: '用户注册' })
  @ApiResponse({ description: '注册成功' })
  async register(@Body() registerDto: RegisterDto) {
    const { username, password, nickname } = registerDto;
    return this.authService.register(username, password, nickname);
  }

  @Post('login')
  @ApiOperation({ summary: '用户登录' })
  @ApiResponse({ description: '登录成功' })
  async login(@Body() loginDto: LoginDto) {
    const { username, password } = loginDto;
    return this.authService.login(username, password);
  }

  @Post('wallet-signature-login')
  @ApiResponse({ status: 200, type: LoginResponseDto, description: '签名登录成功，返回token和用户信息' })
  async walletSignatureLogin(@Body() dto: WalletSignatureLoginDto) {
    const result = await this.authService.walletSignatureLogin(dto);
    // 检查并创建用户目录
    await this.ensureUserDirectories(result.user.id);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Put('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改密码' })
  @ApiResponse({ status: 200, description: '密码修改成功' })
  async changePassword(
    @Request() req,
    @Body('oldPassword') oldPassword: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.changePassword(req.user.id, oldPassword, newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Put('reset-password/:userId')
  @ApiBearerAuth()
  @ApiOperation({ summary: '重置用户密码' })
  @ApiResponse({ status: 200, description: '密码重置成功' })
  async resetPassword(
    @Param('userId') userId: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.resetPassword(userId, newPassword);
  }

  @Post('verify-token')
  @ApiOperation({ summary: '验证令牌' })
  @ApiResponse({ status: 200, description: '令牌有效' })
  async verifyToken(@Body('token') token: string) {
    return this.authService.verifyToken(token);
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