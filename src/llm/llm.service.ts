import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { LlmProvider } from '../entities/llm-provider.entity';
import { LlmModel } from '../entities/llm-model.entity';

@Injectable()
export class LlmService {
  constructor(
    @InjectRepository(LlmProvider)
    private readonly providerRepo: Repository<LlmProvider>,
    @InjectRepository(LlmModel)
    private readonly modelRepo: Repository<LlmModel>,
  ) {}

  // Provider CRUD
  findAllProviders(user_id?: string) {
    if (user_id) {
      return this.providerRepo.find({ where: { user_id } });
    }
    return this.providerRepo.find();
  }
  findProviderById(id: string, user_id: string) {
    return this.providerRepo.findOne({ where: { id, user_id } });
  }
  createProvider(dto: Partial<LlmProvider>) {
    return this.providerRepo.save(this.providerRepo.create(dto));
  }
  updateProvider(id: string, dto: Partial<LlmProvider>) {
    // 只更新当前用户的数据
    return this.providerRepo.update({ id, user_id: dto.user_id }, dto);
  }
  deleteProvider(id: string, user_id: string) {
    return this.providerRepo.delete({ id, user_id });
  }

  // Model CRUD
  findAllModels(user_id?: string) {
    if (user_id) {
      return this.modelRepo.find({ where: { user_id }, relations: ['provider'] });
    }
    return this.modelRepo.find({ relations: ['provider'] });
  }
  findModelById(id: string, user_id: string) {
    return this.modelRepo.findOne({ where: { id, user_id }, relations: ['provider'] });
  }
  async findProvidersPaged(user_id: string | undefined, page = 1, limit = 20, name?: string) {
    const where: any = user_id ? { user_id } : {};
    if (name) where.name = (typeof name === 'string') ? Like(`%${name}%`) : undefined;
    const [data, total] = await this.providerRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { id: 'DESC' },
    });
    return { data, total, page, limit };
  }

  async findModelsPaged(user_id: string | undefined, page = 1, limit = 20, name?: string, provider?: string) {
    const where: any = user_id ? { user_id } : {};
    if (name) where.name = (typeof name === 'string') ? Like(`%${name}%`) : undefined;
    if (provider) where.provider = provider;
    const [data, total] = await this.modelRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { id: 'DESC' },
      relations: ['provider'],
    });
    return { data, total, page, limit };
  }

  async createModel(dto: Partial<LlmModel> & { providerId?: string }) {
    let provider = dto.provider;
    if (!provider && dto.providerId) {
      const found = await this.providerRepo.findOneBy({ id: dto.providerId });
provider = found === null ? undefined : found;
    }
    if (!provider) throw new Error('Provider not found');
    const entity = this.modelRepo.create({ ...dto, provider });
    delete (entity as any).providerId;
    return this.modelRepo.save(entity);
  }
  async updateModel(id: string, dto: Partial<LlmModel> & { providerId?: string }) {
    // 只更新当前用户的数据
    let provider = dto.provider;
    if (!provider && dto.providerId) {
      const found = await this.providerRepo.findOneBy({ id: dto.providerId });
provider = found === null ? undefined : found;
    }
    const updateData = { ...dto, provider };
    delete (updateData as any).providerId;
    return this.modelRepo.update({ id, user_id: dto.user_id }, updateData);
  }
  deleteModel(id: string, user_id: string) {
    return this.modelRepo.delete({ id, user_id });
  }
}
