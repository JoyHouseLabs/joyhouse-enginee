import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Knowledgebase } from '../entities/knowledgebase.entity';
import { ulid } from 'ulid';

@Injectable()
export class KnowledgebaseService {
  constructor(
    @InjectRepository(Knowledgebase)
    private readonly kbRepo: Repository<Knowledgebase>,
  ) {}

  async findById(id: string, userId: string): Promise<Knowledgebase | null> {
    return this.kbRepo.findOneBy({ id, userId });
  }

  async findAll(userId: string, page = 1, pageSize = 10, name?: string): Promise<{ data: Knowledgebase[]; total: number }> {
    const qb = this.kbRepo.createQueryBuilder('kb').where('kb.userId = :userId', { userId });
    if (name) {
      qb.andWhere('kb.name LIKE :name', { name: `%${name}%` });
    }
    qb.orderBy('kb.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async create(body: Partial<Knowledgebase>, userId: string): Promise<Knowledgebase> {
    const entity = this.kbRepo.create({
      ...body,
      id: ulid(),
      userId,
      embeddingModel: body.embeddingModel,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return this.kbRepo.save(entity);
  }

  async update(id: string, userId: string, body: Partial<Knowledgebase>): Promise<Knowledgebase | undefined> {
    const kb = await this.kbRepo.findOneBy({ id, userId });
    if (!kb) throw new NotFoundException('知识库不存在');
    Object.assign(kb, body, { embeddingModel: body.embeddingModel, updatedAt: new Date() });
    return this.kbRepo.save(kb);
  }

  async remove(id: string, userId: string): Promise<boolean> {
    const kb = await this.kbRepo.findOneBy({ id, userId });
    if (!kb) return false;
    await this.kbRepo.remove(kb);
    return true;
  }
}
