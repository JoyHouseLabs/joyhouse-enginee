import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { App } from './app.entity';
import { CreateAppDto, UpdateAppDto, AppQueryDto } from './dto/app.dto';
import { UserService } from '../user/user.service';

@Injectable()
export class AppStoreService {
  constructor(
    @InjectRepository(App)
    private readonly appRepository: Repository<App>,
    private readonly userService: UserService,
  ) {}

  async create(userId: string, createDto: CreateAppDto): Promise<App> {
    const app = this.appRepository.create({
      ...createDto,
      userId,
    });
    return this.appRepository.save(app);
  }

  async findAll(query: AppQueryDto) {
    const { page = 1, pageSize = 10, name } = query;
    const skip = (page - 1) * pageSize;

    const queryBuilder = this.appRepository.createQueryBuilder('app');

    if (name) {
      queryBuilder.where('app.name LIKE :name', { name: `%${name}%` });
    }

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      pageSize
    };
  }

  async findOne(id: string): Promise<App> {
    const app = await this.appRepository.findOne({ where: { id } });
    if (!app) {
      throw new NotFoundException('应用不存在');
    }
    return app;
  }

  async update(id: string, updateDto: UpdateAppDto): Promise<App> {
    const app = await this.findOne(id);
    Object.assign(app, updateDto);
    return this.appRepository.save(app);
  }

  async remove(id: string, userId: string): Promise<void> {
    const app = await this.findOne(id);
    if (!app) {
      throw new NotFoundException(`App with ID ${id} not found`);
    }

    // 检查用户权限
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 如果不是管理员且不是应用创建者，则拒绝删除
    if (!user.isAdmin && app.userId !== userId) {
      throw new ForbiddenException('Only admin or app creator can delete the app');
    }

    await this.appRepository.remove(app);
  }
} 