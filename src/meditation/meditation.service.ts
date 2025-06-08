import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Meditation } from './meditation.entity';
import { CreateMeditationDto } from './meditation-create.dto';
import { UpdateMeditationDto } from './meditation-update.dto';
import { MeditationQueryDto } from './meditation-query.dto';

@Injectable()
export class MeditationService {
  constructor(
    @InjectRepository(Meditation)
    private meditationRepository: Repository<Meditation>,
  ) {}

  async findAll(query: MeditationQueryDto): Promise<{ items: Meditation[]; total: number; page: number; pageSize: number; }> {
    const { page = 1, pageSize = 10, userId, level, search } = query;
    const skip = (page - 1) * pageSize;

    const queryBuilder = this.meditationRepository.createQueryBuilder('meditation');

    queryBuilder.leftJoinAndSelect('meditation.user', 'user'); // Ensure user relation is loaded

    // Filter for public meditations for the Meditation Square
    queryBuilder.andWhere('meditation.isPublic = :isPublic', { isPublic: true });

    if (userId) {
      queryBuilder.andWhere('meditation.userId = :userId', { userId });
    }

    if (level) {
      queryBuilder.andWhere('meditation.level = :level', { level });
    }

    if (search) {
      queryBuilder.andWhere('meditation.name LIKE :search', { search: `%${search}%` });
    }

    queryBuilder.orderBy('meditation.createdAt', 'DESC')
      .skip(skip)
      .take(pageSize);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string): Promise<Meditation> {
    const meditation = await this.meditationRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!meditation) {
      throw new NotFoundException(`Meditation with ID ${id} not found`);
    }

    return meditation;
  }

  async create(
    createMeditationDto: CreateMeditationDto,
    userId: string,
  ): Promise<Meditation> {
    const meditation = this.meditationRepository.create({
      ...createMeditationDto,
      userId,
    });

    return this.meditationRepository.save(meditation);
  }

  async update(
    id: string,
    updateMeditationDto: UpdateMeditationDto,
  ): Promise<Meditation> {
    const meditation = await this.findOne(id);

    Object.assign(meditation, updateMeditationDto);
    return this.meditationRepository.save(meditation);
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.meditationRepository.delete({ id, userId });

    if (result.affected === 0) {
      throw new NotFoundException(`Meditation with ID ${id} not found`);
    }
  }

  async findByUserId(userId: string, query: Pick<MeditationQueryDto, 'page' | 'pageSize'>): Promise<{ items: Meditation[]; total: number; page: number; pageSize: number; }> {
    const { page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const queryBuilder = this.meditationRepository.createQueryBuilder('meditation');

    queryBuilder
      .leftJoinAndSelect('meditation.user', 'user') // Ensure user relation is loaded
      .where('meditation.userId = :userId', { userId })
      .orderBy('meditation.createdAt', 'DESC')
      .skip(skip)
      .take(pageSize);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      pageSize,
    };
  }
}
