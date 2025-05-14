import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UserService } from './user.service';
import { RegisterDto, LoginDto } from '../dto/auth.dto';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly userService: UserService,
    private readonly walletService: WalletService,
  ) {}

  async register(registerDto: RegisterDto): Promise<User> {
    const { username, password, nickname } = registerDto;
    const exist = await this.userRepo.findOneBy({ username });
    if (exist) throw new ConflictException('用户名已存在');
    
    // 检查是否是第一个用户
    const userCount = await this.userRepo.count();
    const isFirstUser = userCount === 0;
    
    // hash 密码
    const hashed = await bcrypt.hash(password, 10);
    // 只允许 username/nickname 输入，id 自动生成
    const user = await this.userService.register({
      username,
      password: hashed,
      nickname,
      isAdmin: isFirstUser // 第一个用户自动成为管理员
    });
    
    // 自动为新用户创建钱包
    await this.walletService.createWalletForUser(user.id, password);
    return user;
  }

  async login(dto: LoginDto): Promise<{ token: string; user: User }> {
    const user = await this.userRepo.findOneBy({ username: dto.username });
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    const token = jwt.sign(
      { 
        sub: user.id, 
        username: user.username,
        isAdmin: user.isAdmin // 将管理员状态添加到 token 中
      },
      process.env.JWT_SECRET || 'joyhouse-secret',
      { expiresIn: '7d' }
    );
    return { token, user };
  }

  /**
   * 钱包地址签名登录
   * @param dto WalletSignatureLoginDto
   */
  async walletSignatureLogin(dto: {
    address: string;
    mainchain: 'evm' | 'sol';
    message: string;
    sign: string;
    ts: number | string;
  }): Promise<{ token: string; user: User }> {
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
    let user = await this.userRepo.findOneBy({ username: standardizedAddress });
    if (!user) {
      // 检查是否是第一个用户
      const userCount = await this.userRepo.count();
      const isFirstUser = userCount === 0;
      
      // 3. 若不存在，创建用户
      const strongPwd = Array(32).fill(0).map(() => Math.random().toString(36).slice(2)).join('').slice(0, 32);
      const hashed = await (await import('bcryptjs')).hash(strongPwd, 10);
      user = await this.userService.register({
        username: standardizedAddress,
        password: hashed,
        nickname: standardizedAddress,
        isAdmin: isFirstUser // 第一个用户自动成为管理员
      });
      // 可选：自动为新用户创建钱包
      await this.walletService.createWalletForUser(user.id, strongPwd, dto.mainchain);
    }
    // 4. 签发token
    const token = (await import('jsonwebtoken')).sign(
      { 
        sub: user.id, 
        username: user.username,
        isAdmin: user.isAdmin // 将管理员状态添加到 token 中
      },
      process.env.JWT_SECRET || 'joyhouse-secret',
      { expiresIn: '7d' }
    );
    return { token, user };
  }
}

