import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like } from 'typeorm'
import { Meditation } from './meditation.entity'
import { CreateMeditationDto } from './meditation-create.dto'
import { UpdateMeditationDto } from './meditation-update.dto'
import { MeditationQueryDto } from './meditation-query.dto'

@Injectable()
export class MeditationService {
  constructor(
    @InjectRepository(Meditation)
    private meditationRepository: Repository<Meditation>
  ) {}

  async findAll(query: MeditationQueryDto): Promise<Meditation[]> {
    const where: any = {}

    if (query.userId) {
      where.userId = query.userId
    }

    if (query.level) {
      where.level = query.level
    }

    if (query.search) {
      where.name = Like(`%${query.search}%`)
    }

    return this.meditationRepository.find({
      where,
      order: { createdAt: 'DESC' },
      relations: ['user']
    })
  }

  async findOne(id: string): Promise<Meditation> {
    const meditation = await this.meditationRepository.findOne({
      where: { id },
      relations: ['user']
    })

    if (!meditation) {
      throw new NotFoundException(`Meditation with ID ${id} not found`)
    }

    return meditation
  }

  async create(createMeditationDto: CreateMeditationDto, userId: string): Promise<Meditation> {
    const meditation = this.meditationRepository.create({
      ...createMeditationDto,
      userId
    })

    return this.meditationRepository.save(meditation)
  }

  async update(id: string, updateMeditationDto: UpdateMeditationDto): Promise<Meditation> {
    const meditation = await this.findOne(id)
    
    Object.assign(meditation, updateMeditationDto)
    return this.meditationRepository.save(meditation)
  }

  async remove(id: string): Promise<void> {
    const result = await this.meditationRepository.delete(id)
    
    if (result.affected === 0) {
      throw new NotFoundException(`Meditation with ID ${id} not found`)
    }
  }

  async findByUserId(userId: string): Promise<Meditation[]> {
    return this.meditationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      relations: ['user']
    })
  }
} 