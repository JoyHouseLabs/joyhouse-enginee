import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSubscribe, SubscribeStatus } from './app-subscribe.entity';
import { CreateAppSubscribeDto, UpdateAppSubscribeDto, AppSubscribeQueryDto } from './dto/app-subscribe.dto';
import { App } from './app.entity';
import { MoreThan, In } from 'typeorm';

@Injectable()
export class AppSubscribeService {
  constructor(
    @InjectRepository(AppSubscribe)
    private appSubscribeRepository: Repository<AppSubscribe>,
    @InjectRepository(App)
    private appRepository: Repository<App>,
  ) {}

  async create(userId: string, createDto: CreateAppSubscribeDto): Promise<AppSubscribe> {
    // 检查应用是否存在
    const app = await this.appRepository.findOne({ where: { id: createDto.appId } });
    if (!app) {
      throw new NotFoundException('应用不存在');
    }

    // 检查是否已经存在活跃的订阅
    const existingActiveSubscribe = await this.appSubscribeRepository.findOne({
      where: {
        userId,
        appId: createDto.appId,
        status: SubscribeStatus.ACTIVE,
      },
    });

    if (existingActiveSubscribe) {
      throw new BadRequestException('已经订阅该应用');
    }

    // 查找已取消或过期的订阅
    const existingSubscribe = await this.appSubscribeRepository.findOne({
      where: {
        userId,
        appId: createDto.appId,
        status: In([SubscribeStatus.CANCELLED, SubscribeStatus.EXPIRED]),
      },
    });

    if (existingSubscribe) {
      // 更新现有订阅
      existingSubscribe.status = SubscribeStatus.ACTIVE;
      existingSubscribe.expireAt = createDto.expireAt;
      return this.appSubscribeRepository.save(existingSubscribe);
    }

    // 创建新订阅
    const subscribe = this.appSubscribeRepository.create({
      userId,
      appId: createDto.appId,
      expireAt: createDto.expireAt,
      status: SubscribeStatus.ACTIVE,
    });

    return this.appSubscribeRepository.save(subscribe);
  }

  async findAll(query: AppSubscribeQueryDto) {
    const { page = 1, pageSize = 10, userId, appId, status } = query;
    const skip = (Number(page) - 1) * Number(pageSize);

    const queryBuilder = this.appSubscribeRepository.createQueryBuilder('subscribe');

    if (userId) {
      queryBuilder.andWhere('subscribe.userId = :userId', { userId });
    }

    if (appId) {
      queryBuilder.andWhere('subscribe.appId = :appId', { appId });
    }

    if (status) {
      queryBuilder.andWhere('subscribe.status = :status', { status });
    }

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(Number(pageSize))
      .getManyAndCount();

    return {
      items,
      total,
      page,
      pageSize
    };
  }

  async findOne(id: string): Promise<AppSubscribe> {
    const subscribe = await this.appSubscribeRepository.findOne({ where: { id } });
    if (!subscribe) {
      throw new NotFoundException('订阅不存在');
    }
    return subscribe;
  }

  async update(id: string, updateDto: UpdateAppSubscribeDto): Promise<AppSubscribe> {
    const subscribe = await this.findOne(id);
    Object.assign(subscribe, updateDto);
    return this.appSubscribeRepository.save(subscribe);
  }

  async unsubscribe(id: string): Promise<AppSubscribe> {
    const subscribe = await this.findOne(id);
    subscribe.status = SubscribeStatus.CANCELLED;
    return this.appSubscribeRepository.save(subscribe);
  }

  async checkSubscription(userId: string, appId: string): Promise<boolean> {
    const subscribe = await this.appSubscribeRepository.findOne({
      where: {
        userId,
        appId,
        status: SubscribeStatus.ACTIVE,
        expireAt: MoreThan(new Date()),
      },
    });
    return !!subscribe;
  }
} 