import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './task.entity';
import { TaskItem } from './task-item.entity';
import { TaskGroup } from './task-group.entity';
import { TaskItemService } from './task-item.service';
import { TaskGroupService } from './task-group.service';
import { UserRewardService } from '../reward/user-reward.service';
import { TaskDto } from './task.dto';
import { TaskItemDto } from './task-item.dto';
import { TaskStatus, TaskType } from './task-query.dto';

@Injectable()
export class UserTaskService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    public readonly taskItemService: TaskItemService,
    private taskGroupService: TaskGroupService,
    private userRewardService: UserRewardService,
  ) {}

  private toTaskItem(taskItemDto: TaskItemDto): TaskItem {
    const taskItem = new TaskItem();
    Object.assign(taskItem, {
      id: taskItemDto.id,
      name: taskItemDto.name,
      icon: taskItemDto.icon,
      description: taskItemDto.description || '',
      taskGroupId: taskItemDto.taskGroupId,
      type: taskItemDto.type || TaskType.CUSTOM,
      params: taskItemDto.params || {},
      isActive: taskItemDto.isActive ?? true,
      weight: taskItemDto.weight ?? 0,
      prerequisites: taskItemDto.prerequisites || [],
      rewards: taskItemDto.rewards || null,
      rewardId: taskItemDto.rewardId || null,
      dueDate: taskItemDto.dueDate || null,
      createdAt: taskItemDto.createdAt || new Date(),
      updatedAt: taskItemDto.updatedAt || new Date(),
      taskGroup: taskItemDto.taskGroup
    });
    return taskItem;
  }

  async createTaskFromTemplate(userId: string, template: TaskItemDto): Promise<Task> {
    const taskItem = this.toTaskItem(template);
    const task = new Task();
    task.id = (await import('ulid')).ulid();
    task.name = taskItem.name;
    task.icon = taskItem.icon;
    task.description = taskItem.description;
    task.user_id = userId;
    task.status = TaskStatus.PENDING;
    task.type = taskItem.type;
    task.params = taskItem.params;
    task.rewardId = taskItem.rewardId;
    task.taskGroupId = taskItem.taskGroupId;
    task.createdAt = new Date();
    task.updatedAt = new Date();

    return this.taskRepository.save(task);
  }

  async createTasksFromGroup(userId: string, groupId: string): Promise<Task[]> {
    const group = await this.taskGroupService.findOne(groupId);
    if (!group) {
      throw new Error('Task group not found');
    }

    const tasks: Task[] = [];
    if (group.taskItems) {
      for (const taskItem of group.taskItems) {
        const taskItemDto = new TaskItemDto();
        Object.assign(taskItemDto, {
          id: taskItem.id,
          name: taskItem.name,
          icon: taskItem.icon,
          description: taskItem.description || '',
          taskGroupId: taskItem.taskGroupId,
          type: taskItem.type || TaskType.CUSTOM,
          params: taskItem.params || {},
          isActive: taskItem.isActive ?? true,
          weight: taskItem.weight ?? 0,
          prerequisites: taskItem.prerequisites || [],
          rewards: taskItem.rewards || null,
          rewardId: taskItem.rewardId || null,
          dueDate: taskItem.dueDate || null,
          createdAt: taskItem.createdAt || new Date(),
          updatedAt: taskItem.updatedAt || new Date(),
          taskGroup: group
        });
        const task = await this.createTaskFromTemplate(userId, taskItemDto);
        tasks.push(task);
      }
    }

    return tasks;
  }

  async updateTaskProgress(taskId: string, userId: string, progress: number): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, user_id: userId },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    task.progress = progress;
    if (progress >= 100) {
      task.status = TaskStatus.COMPLETED;
      await this.handleTaskCompletion(task);
    } else if (progress > 0) {
      task.status = TaskStatus.IN_PROGRESS;
    }

    return this.taskRepository.save(task);
  }

  private async handleTaskCompletion(task: Task): Promise<void> {
    if (task.rewardId) {
      await this.userRewardService.grantReward(task.user_id, task.rewardId);
    }
  }

  async getUserTaskProgress(userId: string, taskGroupId?: string): Promise<Task[]> {
    const query = this.taskRepository.createQueryBuilder('task')
      .where('task.user_id = :userId', { userId });

    if (taskGroupId) {
      query.andWhere('task.taskGroupId = :taskGroupId', { taskGroupId });
    }

    return query.getMany();
  }
} 