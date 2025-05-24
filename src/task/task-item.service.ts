import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskItem } from './task-item.entity';
import { TaskGroup } from './task-group.entity';
import {
  CreateTaskItemDto,
  UpdateTaskItemDto,
  TaskItemDto,
  TaskItemQueryDto,
} from './task-item.dto';

@Injectable()
export class TaskItemService {
  constructor(
    @InjectRepository(TaskItem)
    public readonly taskItemRepository: Repository<TaskItem>,
    @InjectRepository(TaskGroup)
    private taskGroupRepository: Repository<TaskGroup>,
  ) {}

  private toTaskItemDto(taskItem: TaskItem): TaskItemDto {
    const dto = new TaskItemDto();
    Object.assign(dto, taskItem);
    return dto;
  }

  async create(createDto: CreateTaskItemDto): Promise<TaskItemDto> {
    const taskItem = new TaskItem();
    Object.assign(taskItem, createDto);
    const saved = await this.taskItemRepository.save(taskItem);
    return this.toTaskItemDto(saved);
  }

  async update(
    id: string,
    updateDto: Partial<CreateTaskItemDto>,
  ): Promise<TaskItemDto> {
    const item = await this.taskItemRepository.findOne({ where: { id } });
    if (!item) {
      throw new Error('Task item not found');
    }

    Object.assign(item, updateDto);
    const saved = await this.taskItemRepository.save(item);
    return this.toTaskItemDto(saved);
  }

  async findOne(id: string): Promise<TaskItemDto> {
    const item = await this.taskItemRepository.findOne({ where: { id } });
    if (!item) {
      throw new Error('Task item not found');
    }
    return this.toTaskItemDto(item);
  }

  async findAll(query: TaskItemQueryDto): Promise<TaskItemDto[]> {
    const qb = this.taskItemRepository.createQueryBuilder('taskItem');

    if (query.taskGroupId) {
      qb.andWhere('taskItem.taskGroupId = :taskGroupId', {
        taskGroupId: query.taskGroupId,
      });
    }

    if (query.type) {
      qb.andWhere('taskItem.type = :type', { type: query.type });
    }

    const items = await qb.getMany();
    return items.map((item) => this.toTaskItemDto(item));
  }

  async remove(id: string): Promise<void> {
    const result = await this.taskItemRepository.delete(id);
    if (result.affected === 0) {
      throw new Error('Task item not found');
    }
  }

  async findByTaskGroup(taskGroupId: string): Promise<TaskItemDto[]> {
    const taskItems = await this.taskItemRepository.find({
      where: { taskGroupId },
      relations: ['reward'],
    });

    return taskItems.map((item) => this.toTaskItemDto(item));
  }
}
