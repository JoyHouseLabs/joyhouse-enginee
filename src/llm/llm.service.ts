import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { LlmProvider } from './llm-provider.entity';
import { LlmModel } from './llm-model.entity';
import { ChatRequest, ChatResponse } from './interfaces/chat.interface';
import axios from 'axios';
import { Observable } from 'rxjs';

@Injectable()
export class LlmService {
  constructor(
    @InjectRepository(LlmProvider)
    private readonly providerRepo: Repository<LlmProvider>,
    @InjectRepository(LlmModel)
    private readonly modelRepo: Repository<LlmModel>,
  ) {}

  // Provider CRUD
  findAllProviders(userId: string) {
    return this.providerRepo.find({ where: { userId } });
  }

  findProviderById(id: string, userId: string) {
    return this.providerRepo.findOne({ where: { id, userId } });
  }

  createProvider(dto: Partial<LlmProvider>) {
    if (!dto.userId) {
      throw new Error('userId is required');
    }
    return this.providerRepo.save(this.providerRepo.create(dto));
  }

  updateProvider(id: string, dto: Partial<LlmProvider>) {
    // 只更新当前用户的数据
    return this.providerRepo.update({ id, userId: dto.userId }, dto);
  }

  async deleteProvider(id: string, userId: string) {
    // 先删除所有该 provider 下的模型
    await this.modelRepo.delete({ provider: { id } });
    // 再删除 provider 本身
    return this.providerRepo.delete({ id, userId });
  }

  // Model CRUD
  findAllModels(userId: string) {
    return this.modelRepo.find({
      where: { userId },
      relations: ['provider'],
    });
  }

  findModelById(id: string, userId: string) {
    return this.modelRepo.findOne({
      where: { id, userId },
      relations: ['provider'],
    });
  }

  async findProvidersPaged(
    userId: string,
    page = 1,
    pageSize = 20,
    name?: string,
    isPublic?: boolean,
  ): Promise<{ list: any[]; total: number; page: number; pageSize: number }> {
    const where: any = { userId };
    if (name)
      where.name = typeof name === 'string' ? Like(`%${name}%`) : undefined;
    if (typeof isPublic === 'boolean') {
      where.isPublic = isPublic;
    }
    const [data, total] = await this.providerRepo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { id: 'DESC' },
    });
    // 为每个 provider 统计模型数量
    const listWithModelCount = await Promise.all(
      data.map(async (provider) => {
        const modelCount = await this.modelRepo.count({ where: { provider } });
        return { ...provider, modelCount };
      }),
    );
    return { list: listWithModelCount, total, page, pageSize };
  }

  async findModelsPaged(
    userId: string,
    page = 1,
    pageSize = 20,
    name?: string,
    provider?: string,
    isPublic?: boolean,
  ): Promise<{ list: any[]; total: number; page: number; pageSize: number }> {
    const where: any = { userId };
    if (name)
      where.name = typeof name === 'string' ? Like(`%${name}%`) : undefined;
    if (provider) where.provider = { id: provider };
    if (typeof isPublic === 'boolean') {
      where.isPublic = isPublic;
    }
    const [list, total] = await this.modelRepo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { id: 'DESC' },
      relations: ['provider'],
    });
    return { list, total, page, pageSize };
  }

  async createModel(dto: Partial<LlmModel> & { providerId?: string }) {
    if (!dto.userId) {
      throw new Error('userId is required');
    }
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

  async updateModel(
    id: string,
    dto: Partial<LlmModel> & { providerId?: string },
  ) {
    if (!dto.userId) {
      throw new Error('userId is required');
    }
    // 只更新当前用户的数据
    let provider = dto.provider;
    if (!provider && dto.providerId) {
      const found = await this.providerRepo.findOneBy({ id: dto.providerId });
      provider = found === null ? undefined : found;
    }
    const updateData = { ...dto, provider };
    delete (updateData as any).providerId;
    return this.modelRepo.update({ id, userId: dto.userId }, updateData);
  }

  deleteModel(id: string, userId: string) {
    return this.modelRepo.delete({ id, userId });
  }

  async setDefaultModel(id: string, userId: string): Promise<boolean> {
    // 1. 验证模型是否存在且属于该用户
    const model = await this.modelRepo.findOne({ where: { id, userId } });
    if (!model) {
      return false;
    }

    // 2. 开启事务，确保操作的原子性
    return this.modelRepo.manager.transaction(async (manager) => {
      // 3. 将该用户的所有模型设置为非默认
      await manager.update(LlmModel, { userId }, { isDefault: false });

      // 4. 将指定模型设置为默认
      const result = await manager.update(
        LlmModel,
        { id, userId },
        { isDefault: true },
      );

      return (result.affected ?? 0) > 0;
    });
  }

  async countModelsByProvider(providerId: string): Promise<number> {
    return this.modelRepo.count({ where: { provider: { id: providerId } } });
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { model: modelName, messages, ...params } = request;

    // 获取模型信息
    const model = await this.modelRepo.findOne({
      where: { name: modelName },
      relations: ['provider'],
    });

    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }

    const provider = model.provider;
    if (!provider) {
      throw new Error(`Provider not found for model ${modelName}`);
    }

    // 根据不同的提供商调用不同的 API
    switch (provider.apiType) {
      case 'openai':
        return this.chatWithOpenAI(model, messages, params);
      case 'ollama':
        return this.chatWithOllama(model, messages, params);
      default:
        throw new Error(`Unsupported provider type: ${provider.apiType}`);
    }
  }

  private async chatWithOpenAI(
    model: LlmModel,
    messages: any[],
    params: any,
  ): Promise<ChatResponse> {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: model.name,
        messages,
        ...params,
      },
      {
        headers: {
          Authorization: `Bearer ${model.provider.apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const result = response.data;
    return {
      content: result.choices[0].message.content,
      model: model.name,
      usage: {
        promptTokens: result.usage.prompt_tokens,
        completionTokens: result.usage.completion_tokens,
        totalTokens: result.usage.total_tokens,
      },
    };
  }

  private async chatWithOllama(
    model: LlmModel,
    messages: any[],
    params: any,
  ): Promise<ChatResponse> {
    const response = await axios.post(`${model.provider.baseUrl}/api/chat`, {
      model: model.name,
      messages,
      ...params,
    });

    const result = response.data;
    return {
      content: result.message.content,
      model: model.name,
    };
  }

  async streamChat(
    modelName: string,
    request: ChatRequest,
  ): Promise<Observable<{ content: string; done: boolean }>> {
    const model = await this.modelRepo.findOne({
      where: { name: modelName },
      relations: ['provider'],
    });

    if (!model) {
      throw new NotFoundException(`LLM model ${modelName} not found`);
    }

    const provider = model.provider;
    if (!provider) {
      throw new NotFoundException(`Provider for model ${modelName} not found`);
    }

    switch (provider.apiType) {
      case 'openai':
        return this.streamOpenAIChat(model, request);
      case 'ollama':
        return this.streamOllamaChat(model, request);
      default:
        throw new Error(`Unsupported provider type: ${provider.apiType}`);
    }
  }

  private async streamOpenAIChat(
    model: LlmModel,
    request: ChatRequest,
  ): Promise<Observable<{ content: string; done: boolean }>> {
    return new Observable((subscriber) => {
      const response = axios.post(
        `${model.provider.baseUrl}/v1/chat/completions`,
        {
          model: model.name,
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.maxTokens,
          stream: true,
        },
        {
          headers: {
            Authorization: `Bearer ${model.provider.apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
        },
      );

      response
        .then((res) => {
          res.data.on('data', (chunk: Buffer) => {
            const lines = chunk
              .toString()
              .split('\n')
              .filter((line) => line.trim() !== '');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  subscriber.next({ content: '', done: true });
                  subscriber.complete();
                  return;
                }
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices[0]?.delta?.content || '';
                  if (content) {
                    subscriber.next({ content, done: false });
                  }
                } catch (e) {
                  console.error('Error parsing SSE message:', e);
                }
              }
            }
          });

          res.data.on('end', () => {
            subscriber.next({ content: '', done: true });
            subscriber.complete();
          });

          res.data.on('error', (error: Error) => {
            subscriber.error(error);
          });
        })
        .catch((error) => {
          subscriber.error(error);
        });
    });
  }

  private async streamOllamaChat(
    model: LlmModel,
    request: ChatRequest,
  ): Promise<Observable<{ content: string; done: boolean }>> {
    return new Observable((subscriber) => {
      const response = axios.post(
        `${model.provider.baseUrl}/api/chat`,
        {
          model: model.name,
          messages: request.messages,
          stream: true,
          options: {
            temperature: request.temperature,
            num_predict: request.maxTokens,
          },
        },
        {
          responseType: 'stream',
        },
      );

      response
        .then((res) => {
          res.data.on('data', (chunk: Buffer) => {
            const lines = chunk
              .toString()
              .split('\n')
              .filter((line) => line.trim() !== '');
            for (const line of lines) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.done) {
                  subscriber.next({ content: '', done: true });
                  subscriber.complete();
                  return;
                }
                const content = parsed.message?.content || '';
                if (content) {
                  subscriber.next({ content, done: false });
                }
              } catch (e) {
                console.error('Error parsing Ollama message:', e);
              }
            }
          });

          res.data.on('end', () => {
            subscriber.next({ content: '', done: true });
            subscriber.complete();
          });

          res.data.on('error', (error: Error) => {
            subscriber.error(error);
          });
        })
        .catch((error) => {
          subscriber.error(error);
        });
    });
  }

  async findOne(id: string): Promise<LlmModel | undefined> {
    const model = await this.modelRepo.findOne({ where: { id }, relations: ['provider'] });
    return model || undefined;
  }
}
