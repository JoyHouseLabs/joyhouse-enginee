import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Knowledgebase } from './knowledgebase.entity';
import { Storage } from '../storage/storage.entity';
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

  async findAll(
    userId: string,
    page = 1,
    pageSize = 10,
    name?: string,
  ): Promise<{ data: Knowledgebase[]; total: number }> {
    const qb = this.kbRepo
      .createQueryBuilder('kb')
      .where('kb.userId = :userId', { userId });
    if (name) {
      qb.andWhere('kb.name LIKE :name', { name: `%${name}%` });
    }
    qb.orderBy('kb.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async create(
    body: Partial<Knowledgebase>,
    userId: string,
  ): Promise<Knowledgebase> {
    const entity = this.kbRepo.create({
      ...body,
      id: ulid(),
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return this.kbRepo.save(entity);
  }

  async update(
    id: string,
    userId: string,
    body: Partial<Knowledgebase>,
  ): Promise<Knowledgebase | undefined> {
    const kb = await this.kbRepo.findOneBy({ id, userId });
    if (!kb) throw new NotFoundException('知识库不存在');
    Object.assign(kb, body, {
      updatedAt: new Date(),
    });
    return this.kbRepo.save(kb);
  }

  async addStorageToKnowledgebase(
    knowledgebaseId: string,
    storageId: string,
  ): Promise<void> {
    const kb = await this.kbRepo.findOne({
      where: { id: knowledgebaseId },
      relations: ['includedFiles'],
    });
    if (!kb) {
      throw new NotFoundException('知识库不存在');
    }
    
    // 创建一个Storage对象引用
    const storage = new Storage();
    storage.id = storageId;
    
    // 确保includedFiles数组存在
    if (!kb.includedFiles) {
      kb.includedFiles = [];
    }
    
    // 添加storage到知识库
    kb.includedFiles.push(storage);
    await this.kbRepo.save(kb);
  }

  async remove(id: string, userId: string): Promise<boolean> {
    const kb = await this.kbRepo.findOneBy({ id, userId });
    if (!kb) return false;
    await this.kbRepo.remove(kb);
    return true;
  }
}
