import { Injectable, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UpdateUserDto } from './user.dto';
import { UserSettings } from './user-settings.entity';
import { UserSettingsCreateDto, UserSettingsUpdateDto } from './user-settings.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserSettings)
    private readonly userSettingsRepository: Repository<UserSettings>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOneBy({ id });
  }

  async findByUsername(username: string): Promise<User |   null> {
    return this.userRepo.findOneBy({ username });
  }

  async findAll(
    page = 1,
    limit = 10,
  ): Promise<{ items: User[]; total: number }> {
    const [items, total] = await this.userRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { items, total };
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new HttpException(
        {
          code: 1001,
          message: '用户不存在',
          data: null,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    Object.assign(user, dto);
    user.updatedAt = new Date();
    return this.userRepo.save(user);
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new HttpException(
        {
          code: 1001,
          message: '用户不存在',
          data: null,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.userRepo.remove(user);
  }

  // 设置用户属性（昵称、头像等）
  async setUserProperty(
    userId: string,
    dto: { key?: string; value?: string },
  ): Promise<void> {
    const user = await this.findById(userId);
    if (!user) throw new Error('用户不存在');
    let updated = false;
    if (
      dto.key !== undefined &&
      dto.value !== undefined &&
      dto.key in ['nickname', 'avatar']
    ) {
      user[dto.key] = dto.value;
      updated = true;
    }
    if (dto.key === 'onboarded') {
      user.onboarded =
        typeof dto.value === 'string'
          ? dto.value.toLowerCase() === 'true'
          : Boolean(dto.value);
      updated = true;
    }
    if (updated) {
      user.updatedAt = new Date();
      await this.userRepo.save(user);
    }
  }

  // 修改密码（需旧密码）
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new HttpException(
        {
          code: 1001,
          message: '用户不存在',
          data: null,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const bcrypt = await import('bcryptjs');
    const ok = await bcrypt.compare(oldPassword, user.password);
    if (!ok) {
      throw new HttpException(
        {
          code: 1002,
          message: '旧密码不正确',
          data: null,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.updatedAt = new Date();
    await this.userRepo.save(user);
  }

  // 通过签名验证设置新密码
  async setPasswordBySignature(dto: {
    address: string;
    mainchain: 'evm' | 'sol';
    message: string;
    sign: string;
    ts: number | string;
    newPassword: string;
  }): Promise<void> {
    // 地址规范化
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
    // 验签
    const walletService = (this as any).walletService;
    if (!walletService || typeof walletService.verifySignature !== 'function') {
      throw new Error('钱包服务未注入');
    }
    const valid = await walletService.verifySignature({
      mainchain: dto.mainchain,
      address: standardizedAddress,
      message: dto.message,
      sign: dto.sign,
      ts: dto.ts,
    });
    if (!valid) throw new Error('签名验证失败');
    // 查用户
    const user = await this.findByUsername(standardizedAddress);
    if (!user) throw new Error('用户不存在');
    // 更新密码
    const bcrypt = await import('bcryptjs');
    user.password = await bcrypt.hash(dto.newPassword, 10);
    user.updatedAt = new Date();
    await this.userRepo.save(user);
  }

  async createUserSettings(userId: string, dto: UserSettingsCreateDto): Promise<UserSettings> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const settings = this.userSettingsRepository.create({
      userId,
      ...dto,
    });

    return this.userSettingsRepository.save(settings);
  }

  async updateUserSettings(userId: string, dto: UserSettingsUpdateDto): Promise<UserSettings> {
    const settings = await this.userSettingsRepository.findOne({
      where: { id: dto.id, userId },
    });

    if (!settings) {
      throw new NotFoundException('User settings not found');
    }

    const { id, ...updateData } = dto;
    Object.assign(settings, updateData);

    return this.userSettingsRepository.save(settings);
  }

  async getUserSettings(userId: string): Promise<UserSettings> {
    const settings = await this.userSettingsRepository.findOne({
      where: { userId },
    });

    if (!settings) {
      // 如果用户设置不存在，创建默认设置
      return this.createUserSettings(userId, {});
    }

    return settings;
  }

  async deleteUserSettings(userId: string, settingsId: string): Promise<void> {
    const result = await this.userSettingsRepository.delete({
      id: settingsId,
      userId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('User settings not found');
    }
  }
}
