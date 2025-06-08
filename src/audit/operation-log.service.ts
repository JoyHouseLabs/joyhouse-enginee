import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperationLog } from './operation-log.entity';
import { OperationLogGateway } from './operation-log.gateway';
import { OperationLogQueryDto } from './dto/operation-log-query.dto';

@Injectable()
export class OperationLogService {
  constructor(
    @InjectRepository(OperationLog)
    private readonly logRepo: Repository<OperationLog>,
    @Inject(forwardRef(() => OperationLogGateway))
    private readonly gateway: OperationLogGateway,
  ) {}

  async log(userId: string, action: string, target?: any, detail?: any) {
    const entity = this.logRepo.create({ userId, action, target, detail });
    const saved = await this.logRepo.save(entity);
    this.gateway.notify(saved);
  }

  async list(query: OperationLogQueryDto) {
    const { page = 1, pageSize = 10, userId, action } = query;
    const skip = (page - 1) * pageSize;

    const queryBuilder = this.logRepo.createQueryBuilder('log');

    if (userId) {
      queryBuilder.andWhere('log.userId = :userId', { userId });
    }

    if (action) {
      queryBuilder.andWhere('log.action = :action', { action });
    }

    const [items, total] = await queryBuilder
      .orderBy('log.created_at', 'DESC')
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      pageSize,
    };
  }
}
