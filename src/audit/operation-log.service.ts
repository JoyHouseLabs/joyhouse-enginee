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

  async log(user_id: string, action: string, target?: any, detail?: any) {
    const entity = this.logRepo.create({ user_id, action, target, detail });
    const saved = await this.logRepo.save(entity);
    this.gateway.notify(saved);
  }

  async list(dto: {
    user_id?: string;
    action?: string;
    skip?: number;
    take?: number;
  }): Promise<OperationLog[]> {
    const where: any = {};
    if (dto.user_id) where.user_id = dto.user_id;
    if (dto.action) where.action = dto.action;
    return this.logRepo.find({
      where,
      order: { created_at: 'DESC' },
      skip: dto.skip || 0,
      take: dto.take || 50,
    });
  }
}
