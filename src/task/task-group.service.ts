import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskGroup } from './task-group.entity';
import { TaskItem } from './task-item.entity';
import {
  CreateTaskGroupDto,
  UpdateTaskGroupDto,
  TaskGroupDto,
  TaskGroupQueryDto,
} from './task-group.dto';
import { TaskItemDto } from './task-item.dto';

@Injectable()
export class TaskGroupService {
  constructor(
    @InjectRepository(TaskGroup)
    private taskGroupRepository: Repository<TaskGroup>,
    @InjectRepository(TaskItem)
    private taskItemRepository: Repository<TaskItem>,
  ) {}

  private toTaskGroupDto(taskGroup: TaskGroup): TaskGroupDto {
    const dto = new TaskGroupDto();
    Object.assign(dto, taskGroup);
    if (taskGroup.taskItems) {
      dto.taskItems = taskGroup.taskItems.map((item) => {
        const itemDto = new TaskItemDto();
        Object.assign(itemDto, item);
        return itemDto;
      });
    }
    return dto;
  }

  async create(createDto: CreateTaskGroupDto): Promise<TaskGroupDto> {
    const taskGroup = this.taskGroupRepository.create(createDto);
    const saved = await this.taskGroupRepository.save(taskGroup);
    return this.toTaskGroupDto(saved);
  }

  async update(updateDto: UpdateTaskGroupDto): Promise<TaskGroupDto> {
    const taskGroup = await this.taskGroupRepository.findOne({
      where: { id: updateDto.id },
      relations: ['taskItems'],
    });

    if (!taskGroup) {
      throw new Error('TaskGroup not found');
    }

    Object.assign(taskGroup, updateDto);
    const saved = await this.taskGroupRepository.save(taskGroup);
    return this.toTaskGroupDto(saved);
  }

  async findOne(id: string): Promise<TaskGroupDto> {
    const taskGroup = await this.taskGroupRepository.findOne({
      where: { id },
      relations: ['taskItems', 'reward'],
    });

    if (!taskGroup) {
      throw new Error('TaskGroup not found');
    }

    return this.toTaskGroupDto(taskGroup);
  }

  async findAll(query: TaskGroupQueryDto): Promise<TaskGroupDto[]> {
    const qb = this.taskGroupRepository
      .createQueryBuilder('taskGroup')
      .leftJoinAndSelect('taskGroup.taskItems', 'taskItems')
      .leftJoinAndSelect('taskGroup.reward', 'reward');

    if (query.name) {
      qb.andWhere('taskGroup.name LIKE :name', { name: `%${query.name}%` });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('taskGroup.isActive = :isActive', {
        isActive: query.isActive,
      });
    }

    const taskGroups = await qb.getMany();
    return taskGroups.map((group) => this.toTaskGroupDto(group));
  }

  async remove(id: string): Promise<void> {
    const taskGroup = await this.taskGroupRepository.findOne({
      where: { id },
      relations: ['taskItems'],
    });
    if (!taskGroup) {
      throw new Error('Task group not found');
    }

    // 先删除关联的任务项
    if (taskGroup.taskItems) {
      for (const taskItem of taskGroup.taskItems) {
        taskItem.taskGroup = undefined;
        await this.taskItemRepository.save(taskItem);
      }
    }

    await this.taskGroupRepository.remove(taskGroup);
  }

  async addTaskItem(
    groupId: string,
    taskItemId: string,
  ): Promise<TaskGroupDto> {
    const taskGroup = await this.taskGroupRepository.findOne({
      where: { id: groupId },
      relations: ['taskItems'],
    });

    if (!taskGroup) {
      throw new Error('TaskGroup not found');
    }

    const taskItem = await this.taskItemRepository.findOne({
      where: { id: taskItemId },
    });

    if (!taskItem) {
      throw new Error('TaskItem not found');
    }

    taskItem.taskGroup = taskGroup;
    await this.taskItemRepository.save(taskItem);

    return this.findOne(groupId);
  }

  async removeTaskItem(
    groupId: string,
    taskItemId: string,
  ): Promise<TaskGroupDto> {
    const taskItem = await this.taskItemRepository.findOne({
      where: { id: taskItemId, taskGroupId: groupId },
    });

    if (!taskItem) {
      throw new Error('TaskItem not found in this group');
    }

    taskItem.taskGroup = undefined;
    await this.taskItemRepository.save(taskItem);

    return this.findOne(groupId);
  }
}
