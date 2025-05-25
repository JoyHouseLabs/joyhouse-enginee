import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperationLog } from './operation-log.entity';
import { OperationLogGateway } from './operation-log.gateway';

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

  async list(dto: {
    userId?: string;
    action?: string;
    skip?: number;
    take?: number;
  }): Promise<OperationLog[]> {
    const where: any = {};
    if (dto.userId) where.userId = dto.userId;
    if (dto.action) where.action = dto.action;
    return this.logRepo.find({
      where,
      order: { created_at: 'DESC' },
      skip: dto.skip || 0,
      take: dto.take || 50,
    });
  }
}
