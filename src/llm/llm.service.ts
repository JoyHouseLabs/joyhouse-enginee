import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { LlmProvider } from './llm-provider.entity';
import { LlmModel } from './llm-model.entity';

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
  async deleteProvider(id: string, user_id: string) {
    // 先删除所有该 provider 下的模型
    await this.modelRepo.delete({ provider: { id } });
    // 再删除 provider 本身
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
    // 为每个 provider 统计模型数量
    const listWithModelCount = await Promise.all(
      data.map(async (provider) => {
        const modelCount = await this.modelRepo.count({ where: { provider } });
        return { ...provider, modelCount };
      })
    );
    return { list: listWithModelCount, total, page, limit };

  }

  async findModelsPaged(user_id: string | undefined, page = 1, limit = 20, name?: string, provider?: string): Promise<{ list: any[]; total: number; page: number; limit: number }> {
    const where: any = user_id ? { user_id } : {};
    if (name) where.name = (typeof name === 'string') ? Like(`%${name}%`) : undefined;
    if (provider) where.provider = provider;
    const [list, total] = await this.modelRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { id: 'DESC' },
      relations: ['provider'],
    });
    return { list, total, page, limit };
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

  async setDefaultModel(id: string, user_id: string): Promise<boolean> {
    // 1. 验证模型是否存在且属于该用户
    const model = await this.modelRepo.findOne({ where: { id, user_id } });
    if (!model) {
      return false;
    }

    // 2. 开启事务，确保操作的原子性
    return this.modelRepo.manager.transaction(async (manager) => {
      // 3. 将该用户的所有模型设置为非默认
      await manager.update(LlmModel, { user_id }, { is_default: false });
      
      // 4. 将指定模型设置为默认
      const result = await manager.update(LlmModel, { id, user_id }, { is_default: true });
      
      return (result.affected ?? 0) > 0;
    });
  }

  async countModelsByProvider(providerId: string): Promise<number> {
    return this.modelRepo.count({ where: { provider: { id: providerId } } });
  }
}
