import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Relay } from '../entities/relay.entity';

@Injectable()
export class RelayService {
  constructor(
    @InjectRepository(Relay)
    private readonly relayRepo: Repository<Relay>,
  ) {}

  async findById(id: string, userId?: string): Promise<Relay | null> {
    if (userId) {
      return this.relayRepo.findOneBy({ id, userId });
    }
    return this.relayRepo.findOneBy({ id });
  }

  async findAll(page = 1, pageSize = 10, name?: string, userId?: string): Promise<{ data: Relay[]; total: number }> {
    const qb = this.relayRepo.createQueryBuilder('relay');
    if (userId) {
      qb.where('relay.userId = :userId', { userId });
      if (name) {
        qb.andWhere('relay.name LIKE :name', { name: `%${name}%` });
      }
    } else if (name) {
      qb.where('relay.name LIKE :name', { name: `%${name}%` });
    }
    qb.orderBy('relay.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async create(dto: Partial<Relay>): Promise<Relay> {
    const entity = this.relayRepo.create({
      ...dto,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return this.relayRepo.save(entity);
  }

  async update(id: string, patch: Partial<Relay>): Promise<Relay | undefined> {
    const relay = await this.relayRepo.findOneBy({ id });
    if (!relay) return undefined;
    Object.assign(relay, patch, { updatedAt: new Date() });
    return this.relayRepo.save(relay);
  }

  async remove(id: string): Promise<boolean> {
    const relay = await this.relayRepo.findOneBy({ id });
    if (!relay) return false;
    await this.relayRepo.remove(relay);
    return true;
  }
}
