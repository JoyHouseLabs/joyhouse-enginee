import { Controller, Get, Req, UseGuards, Patch, Body, Post } from '@nestjs/common';
import { WalletService } from '../wallet/wallet.service';
import { ApiTags, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UserDto } from '../dto/user.dto';
import { ChangePasswordDto, WalletSignatureSetPasswordDto, SetUserPropertyDto } from '../dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('用户')
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly walletService: WalletService,
  ) {}

  @Get('me')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, type: UserDto, description: '当前用户信息' })
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req): Promise<UserDto | null> {
    const userId = req.user.sub;
    const user = await this.userService.findById(userId);
    if (!user) return null;
    // 默认查 evm 主链钱包
    const wallet = await this.walletService.findByUserId(userId, 'evm');
    const { password, ...dto } = user;
    return {
      ...dto,
      walletAddress: wallet?.address || null,
      walletMainchain: wallet?.mainchain || null,
    } as UserDto;
  }

  @Post('set-property')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: '用户属性设置成功' })
  @UseGuards(JwtAuthGuard)
  async setUserProperty(@Req() req, @Body() dto: SetUserPropertyDto) {
    const userId = req.user.sub;
    await this.userService.setUserProperty(userId, dto);
    return { message: '用户属性设置成功' };
  }

  @Post('password')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: '密码修改成功' })
  @UseGuards(JwtAuthGuard)
  async changePassword(@Req() req, @Body() dto: ChangePasswordDto) {
    const userId = req.user.sub;
    await this.userService.changePassword(userId, dto.oldPassword, dto.newPassword);
    return { message: '密码修改成功' };
  }

  @Post('password-by-signature')
  @ApiResponse({ status: 200, description: '签名验证成功并设置新密码' })
  async setPasswordBySignature(@Body() dto: WalletSignatureSetPasswordDto) {
    await this.userService.setPasswordBySignature(dto);
    return { message: '密码设置成功' };
  }
}
