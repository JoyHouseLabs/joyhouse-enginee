import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { App } from './app.entity';
import { CreateAppDto, UpdateAppDto, AppQueryDto } from './dto/app.dto';

@Injectable()
export class AppStoreService {
  constructor(
    @InjectRepository(App)
    private appRepository: Repository<App>,
  ) {}

  async create(userId: string, createDto: CreateAppDto): Promise<App> {
    const app = this.appRepository.create({
      ...createDto,
      userId,
    });
    return this.appRepository.save(app);
  }

  async findAll(query: AppQueryDto): Promise<[App[], number]> {
    const { page = 1, pageSize = 10, name } = query;
    const skip = (Number(page) - 1) * Number(pageSize);

    const queryBuilder = this.appRepository.createQueryBuilder('app');

    if (name) {
      queryBuilder.andWhere('app.name LIKE :name', { name: `%${name}%` });
    }

    return queryBuilder
      .skip(skip)
      .take(Number(pageSize))
      .getManyAndCount();
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
} 