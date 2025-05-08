import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Knowledgefile } from '../entities/knowledgefile.entity';
import { ulid } from 'ulid';

@Injectable()
export class KnowledgefileService {
  constructor(
    @InjectRepository(Knowledgefile)
    private readonly kfRepo: Repository<Knowledgefile>,
  ) {}

  async findById(id: string, userId: string): Promise<Knowledgefile | null> {
    return this.kfRepo.findOneBy({ id, userId });
  }

  async findAll(knowledgebaseId: string, userId: string, page = 1, pageSize = 10): Promise<{ data: Knowledgefile[]; total: number }> {
    const qb = this.kfRepo.createQueryBuilder('kf').where('kf.knowledgebaseId = :knowledgebaseId AND kf.userId = :userId', { knowledgebaseId, userId });
    qb.orderBy('kf.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async create(kf: Partial<Knowledgefile>, userId: string, knowledgebaseId: string): Promise<Knowledgefile> {
    const entity = this.kfRepo.create({
      ...kf,
      id: ulid(),
      userId,
      knowledgebaseId,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: kf.status || 'pending',
    });
    return this.kfRepo.save(entity);
  }

  async update(id: string, userId: string, patch: Partial<Knowledgefile>): Promise<Knowledgefile | undefined> {
    const kf = await this.kfRepo.findOneBy({ id, userId });
    if (!kf) return undefined;
    Object.assign(kf, patch, { updatedAt: new Date() });
    return this.kfRepo.save(kf);
  }

  async remove(id: string, userId: string): Promise<boolean> {
    const kf = await this.kfRepo.findOneBy({ id, userId });
    if (!kf) return false;
    await this.kfRepo.remove(kf);
    return true;
  }
}
