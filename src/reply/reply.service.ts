import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reply } from './reply.entity';
import { ReplyCreateDto, ReplyUpdateDto } from './reply.dto';

@Injectable()
export class ReplyService {
  constructor(
    @InjectRepository(Reply)
    private readonly replyRepo: Repository<Reply>,
  ) {}

  async findAll(userId: string, page = 1, pageSize = 10, target?: string, targetId?: string): Promise<{ data: Reply[]; total: number }> {
    const qb = this.replyRepo.createQueryBuilder('reply').where('reply.userId = :userId', { userId });
    if (target) qb.andWhere('reply.target = :target', { target });
    if (targetId) qb.andWhere('reply.targetId = :targetId', { targetId });
    qb.orderBy('reply.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findById(id: string, userId: string): Promise<Reply | null> {
    return this.replyRepo.findOneBy({ id, userId });
  }

  async create(dto: ReplyCreateDto, userId: string): Promise<Reply> {
    const now = new Date();
    const entity = this.replyRepo.create({ ...dto, userId, createdAt: now, updatedAt: now });
    return this.replyRepo.save(entity);
  }

  async update(id: string, userId: string, patch: Partial<Reply>): Promise<Reply | null> {
    const reply = await this.replyRepo.findOneBy({ id, userId });
    if (!reply) return null;
    Object.assign(reply, patch, { updatedAt: new Date() });
    return this.replyRepo.save(reply);
  }

  async remove(id: string, userId: string): Promise<boolean> {
    const reply = await this.replyRepo.findOneBy({ id, userId });
    if (!reply) return false;
    await this.replyRepo.remove(reply);
    return true;
  }
}
