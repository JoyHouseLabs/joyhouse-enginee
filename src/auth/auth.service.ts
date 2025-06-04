import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { User } from '../user/user.entity';
import { StorageDir } from '../storage/storage-dir.entity';
import { WalletService } from '../wallet/wallet.service';
import { RegisterDto, LoginDto } from '../dto/auth.dto';
import * as bcrypt from 'bcryptjs';
import { RoleType } from '../role/role.entity';
import { TokenBlacklist } from './entities/token-blacklist.entity';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(StorageDir)
    private readonly storageDirRepo: Repository<StorageDir>,
    @InjectRepository(TokenBlacklist)
    private readonly tokenBlacklistRepo: Repository<TokenBlacklist>,
    private readonly userService: UserService,
    private readonly walletService: WalletService,
    private readonly jwtService: JwtService,
    private readonly storageService: StorageService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.userRepo.findOneBy({ username });
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async register(username: string, password: string, nickname?: string) {
    // 检查用户名是否已存在
    const existingUser = await this.userRepo.findOneBy({ username });
    if (existingUser) {
      throw new HttpException(
        {
          code: 1001,
          message: '用户名已存在',
          data: null,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // 检查是否是第一个用户
    const isFirstUser = (await this.userRepo.count()) === 0;

    // 加密密码
    const hashed = await bcrypt.hash(password, 10);

    // 创建用户目录
    const [homeDir, shareDir] = await Promise.all([
      this.storageService.createDir({
        userId: '', // 临时ID，稍后更新
        name: 'home',
        parent: '',
      }),
      this.storageService.createDir({
        userId: '', // 临时ID，稍后更新
        name: 'share',
        parent: '',
      }),
    ]);

    // 创建用户
    const user = this.userRepo.create({
      username,
      password: hashed,
      nickname,
      role: isFirstUser ? RoleType.ADMIN : RoleType.USER,
      isAdmin: isFirstUser,
      onboarded: false,
      home_dir_id: homeDir.id,
      share_dir_id: shareDir.id,
    });

    const savedUser = await this.userRepo.save(user);

    // 更新目录的用户ID
    await Promise.all([
      this.storageService.updateDir(homeDir.id, { userId: savedUser.id }),
      this.storageService.updateDir(shareDir.id, { userId: savedUser.id }),
    ]);

    const { password: _, ...result } = savedUser;
    return result;
  }

  async login(username: string, password: string) {
    const user = await this.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const payload = { username: user.username, sub: user.id, role: user.role };
    return {
      token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        remark: user.remark,
        onboarded: user.onboarded,
        isAdmin: user.isAdmin,
        home_dir_id: user.home_dir_id,
        share_dir_id: user.share_dir_id,
      },
    };
  }

  async walletSignatureLogin(dto: {
    address: string;
    mainchain: 'evm' | 'sol';
    message: string;
    sign: string;
    ts: number | string;
  }): Promise<{
    token: string;
    user: Pick<
      User,
      | 'id'
      | 'username'
      | 'nickname'
      | 'avatar'
      | 'remark'
      | 'onboarded'
      | 'isAdmin'
    >;
  }> {
    // 0. 地址规范化
    let standardizedAddress = dto.address;
    if (dto.mainchain === 'evm') {
      try {
        const { getAddress } = await import('ethers');
        standardizedAddress = getAddress(dto.address);
      } catch {
        standardizedAddress = dto.address.toLowerCase();
      }
    } else {
      standardizedAddress = dto.address.toLowerCase();
    }

    // 1. 验签
    const valid = await this.walletService.verifySignature({
      mainchain: dto.mainchain,
      address: standardizedAddress,
      message: dto.message,
      sign: dto.sign,
      ts: dto.ts,
    });
    if (!valid) throw new UnauthorizedException('签名验证失败');

    // 2. 查找用户
    const user = await this.userRepo.findOneBy({
      username: standardizedAddress,
    });
    if (!user) {
      // 检查是否是第一个用户
      const userCount = await this.userRepo.count();
      const isFirstUser = userCount === 0;

      // 3. 若不存在，创建用户
      const strongPwd = Array(32)
        .fill(0)
        .map(() => Math.random().toString(36).slice(2))
        .join('')
        .slice(0, 32);
      const hashed = await bcrypt.hash(strongPwd, 10);
      const username = standardizedAddress;
      const nickname = standardizedAddress;
      // 直接创建用户
      const tuser = this.userRepo.create({
        username,
        password: hashed,
        nickname,
        role: isFirstUser ? RoleType.ADMIN : RoleType.USER,
        onboarded: false,
      });

      const user = await this.userRepo.save(tuser);

      // 可选：自动为新用户创建钱包
      await this.walletService.createWalletForUser(
        user.id,
        strongPwd,
        dto.mainchain,
      );
    }
    // 4. 签发token
    const token = this.jwtService.sign(
      {
        sub: user!.id,
        username: user!.username,
        isAdmin: user!.isAdmin,
      },
      { expiresIn: '7d' },
    );
    return {
      token,
      user: {
        id: user!.id,
        username: user!.username,
        nickname: user!.nickname,
        avatar: user!.avatar,
        remark: user!.remark,
        onboarded: user!.onboarded,
        isAdmin: user!.isAdmin,
      },
    };
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('原密码错误');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepo.update(userId, { password: hashedPassword });
    return { message: '密码修改成功' };
  }

  async resetPassword(userId: string, newPassword: string) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepo.update(userId, { password: hashedPassword });
    return { message: '密码重置成功' };
  }

  async verifyToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.userRepo.findOneBy({ id: payload.sub });
      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }
      return user;
    } catch (error) {
      throw new UnauthorizedException('无效的令牌');
    }
  }

  async invalidateToken(token: string): Promise<void> {
    try {
      // 验证 token 并获取过期时间
      const decoded = this.jwtService.verify(token);

      // 将 token 加入黑名单
      const blacklistEntry = this.tokenBlacklistRepo.create({
        token,
        userId: decoded.sub,
        expiresAt: new Date(decoded.exp * 1000), // 将 JWT 过期时间转换为 Date
      });

      await this.tokenBlacklistRepo.save(blacklistEntry);
    } catch (error) {
      throw new UnauthorizedException('无效的 token');
    }
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklistedToken = await this.tokenBlacklistRepo.findOne({
      where: { token },
    });
    return !!blacklistedToken;
  }

  async invalidateAllUserTokens(userId: string): Promise<void> {
    // 获取用户的所有有效 token
    const blacklistEntries = await this.tokenBlacklistRepo.find({
      where: { userId },
    });

    // 将所有 token 标记为过期
    for (const entry of blacklistEntries) {
      entry.expiresAt = new Date();
      await this.tokenBlacklistRepo.save(entry);
    }
  }
}
