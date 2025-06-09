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
import { RegisterDto, LoginDto } from './auth.dto';
import * as bcrypt from 'bcryptjs';
import { RoleType, Role } from '../role/role.entity';
import { Permission } from '../role/permission.entity';
import { UserRole } from '../role/user-role.entity';
import { TokenBlacklist } from './entities/token-blacklist.entity';
import { StorageService } from '../storage/storage.service';
import { AgentService } from '../agent/agent.service';
import { OperationLogService } from '../audit/operation-log.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  
    @InjectRepository(TokenBlacklist)
    private readonly tokenBlacklistRepo: Repository<TokenBlacklist>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    private readonly userService: UserService,
    private readonly walletService: WalletService,
    private readonly jwtService: JwtService,
    private readonly storageService: StorageService,
    private readonly agentService: AgentService,
    private readonly operationLogService: OperationLogService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.userRepo.findOneBy({ username });
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async register(username: string, password: string, nickname?: string, registerIp?: string, sourceType?: string) {
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

    // 如果是第一个用户,创建角色和权限
    if (isFirstUser) {
      // 创建管理员角色
      const adminRole = this.roleRepo.create({
        name: RoleType.ADMIN,
        description: '系统管理员'
      });
      await this.roleRepo.save(adminRole);

      // 创建普通用户角色
      const userRole = this.roleRepo.create({
        name: RoleType.USER,
        description: '普通用户'
      });
      await this.roleRepo.save(userRole);

      // 为管理员角色添加权限
      const adminPermissions = [
        { controller: 'user', method: 'create' },
        { controller: 'user', method: 'read' },
        { controller: 'user', method: 'update' },
        { controller: 'user', method: 'delete' },
        { controller: 'role', method: 'create' },
        { controller: 'role', method: 'read' },
        { controller: 'role', method: 'update' },
        { controller: 'role', method: 'delete' },
        { controller: 'permission', method: 'create' },
        { controller: 'permission', method: 'read' },
        { controller: 'permission', method: 'update' },
        { controller: 'permission', method: 'delete' }
      ];

      for (const perm of adminPermissions) {
        const permission = this.permissionRepo.create({
          roleId: adminRole.id,
          controller: perm.controller,
          method: perm.method
        });
        await this.permissionRepo.save(permission);
      }

      // 为普通用户角色添加基本权限
      const userPermissions = [
        { controller: 'user', method: 'read' },
        { controller: 'role', method: 'read' }
      ];

      for (const perm of userPermissions) {
        const permission = this.permissionRepo.create({
          roleId: userRole.id,
          controller: perm.controller,
          method: perm.method
        });
        await this.permissionRepo.save(permission);
      }
    }

    // 1. 创建用户（不包含目录ID）
    let user = this.userRepo.create({
      username,
      password: hashed,
      nickname,
      role: isFirstUser ? RoleType.ADMIN : RoleType.USER,
      isAdmin: isFirstUser,
      onboarded: false,
      registerIp,
      sourceType,
    });

    // 2. 保存用户以获取ID
    const savedUserWithId = await this.userRepo.save(user);

    // 如果是第一个用户,分配管理员角色
    if (isFirstUser) {
      const adminRole = await this.roleRepo.findOneBy({ name: RoleType.ADMIN });
      if (adminRole) {
        const userRole = this.userRoleRepo.create({
          userId: savedUserWithId.id,
          roleId: adminRole.id
        });
        await this.userRoleRepo.save(userRole);
      }
    }

    // 3. 使用获取到的用户ID创建用户目录
    const homeDir = await this.storageService.createDir({
      userId: savedUserWithId.id,
      name: 'home',
      parent: undefined,
    });

    const shareDir = await this.storageService.createDir({
      userId: savedUserWithId.id,
      name: 'share',
      parent: undefined,
    });

    // 4. 更新用户实体以包含目录ID
    savedUserWithId.home_dir_id = homeDir.id;
    savedUserWithId.share_dir_id = shareDir.id;

    // 5. 再次保存用户以更新目录ID
    const finalUser = await this.userRepo.save(savedUserWithId);

    // Log user registration
    await this.operationLogService.log(finalUser.id, '用户注册', { username: finalUser.username });

    // 6. 自动生成一个默认的 agent
    await this.agentService.create(
      {
        name: '默认助手',
        description: '这是一个默认的AI助手',
        isPublic: false,
        isDefault: true,
        llmParams: {
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 2000,
        },
      },
      finalUser,
    );

    const { password: _, ...result } = finalUser;
    return result;
  }

  async login(username: string, password: string, ip?: string) {
    const user = await this.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // Update lastLoginIp
    if (ip) {
      await this.userRepo.update(user.id, { lastLoginIp: ip });
    }

    // Log login event
    await this.operationLogService.log(user.id, '用户登录', { username: user.username, ip });

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
        lastLoginIp: ip, // Also include in the response if needed, or fetch updated user
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

  async logout(user: any): Promise<void> {
    // 记录登出日志
    await this.invalidateAllUserTokens(user.id);
    await this.operationLogService.log(user.id, '用户登出', { username: user.username });
  }
}
