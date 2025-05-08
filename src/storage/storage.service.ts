import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Storage } from '../entities/storage.entity';

@Injectable()
export class StorageService {
  constructor(
    @InjectRepository(Storage)
    private readonly storageRepo: Repository<Storage>,
  ) {}

  async saveFile(meta: Partial<Storage>): Promise<Storage> {
    const entity = this.storageRepo.create(meta);
    return this.storageRepo.save(entity);
  }

  // 可扩展：查找、删除等
}
