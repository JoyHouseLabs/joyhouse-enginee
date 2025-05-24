import { Controller, Post, Body, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../user/jwt-auth.guard';
import { IsString, IsOptional } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

class DecryptWalletDto {
  @ApiProperty({ description: '钱包旧密码' })
  @IsString()
  oldPassword: string;

  @ApiProperty({ description: '主链类型', required: false, example: 'evm' })
  @IsOptional()
  @IsString()
  mainchain?: string;
}

class UpdateWalletPasswordDto {
  @ApiProperty({ description: '钱包旧密码' })
  @IsString()
  oldPassword: string;

  @ApiProperty({ description: '新密码' })
  @IsString()
  newPassword: string;

  @ApiProperty({ description: '主链类型', required: false, example: 'evm' })
  @IsOptional()
  @IsString()
  mainchain?: string;
}

@ApiTags('钱包')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('decrypt')
  @ApiBody({ type: DecryptWalletDto })
  @ApiResponse({ status: 200, description: '解密并返回钱包私钥和助记词' })
  async decryptWallet(@Req() req, @Body() dto: DecryptWalletDto) {
    const userId = req.user.sub;
    const wallet = await this.walletService.findByUserId(
      userId,
      dto.mainchain || 'evm',
    );
    if (!wallet) throw new Error('钱包不存在');
    const decrypted = await this.walletService.decryptWallet(
      wallet,
      dto.oldPassword,
    );
    return {
      address: decrypted.address,
      mainchain: decrypted.mainchain,
      privateKey: decrypted.privateKey,
      seed: decrypted.seed,
    };
  }

  @Patch('password')
  @ApiBody({ type: UpdateWalletPasswordDto })
  @ApiResponse({ status: 200, description: '更改钱包密码成功后返回新钱包' })
  async updateWalletPassword(@Req() req, @Body() dto: UpdateWalletPasswordDto) {
    const userId = req.user.sub;
    const wallet = await this.walletService.findByUserId(
      userId,
      dto.mainchain || 'evm',
    );
    if (!wallet) throw new Error('钱包不存在');
    const updated = await this.walletService.updatePassword(
      wallet,
      dto.oldPassword,
      dto.newPassword,
    );
    return updated;
  }
}
