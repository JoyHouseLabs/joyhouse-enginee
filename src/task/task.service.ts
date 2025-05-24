import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Like,
  Between,
  LessThanOrEqual,
  MoreThanOrEqual,
} from 'typeorm';
import { Task } from './task.entity';
import { TaskCreateDto } from './task-create.dto';
import { TaskUpdateDto } from './task-update.dto';
import { TaskQueryDto } from './task-query.dto';
import { PaginatedResponseDto, TaskDto } from './task.dto';
import { validateTaskParams } from './task.utils';
import { TaskSchedulerService } from './task-scheduler.service';
import { TaskType, TaskStatus } from './task-query.dto';
import { CreateTaskDto } from './task.dto';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    private readonly taskScheduler: TaskSchedulerService,
  ) {}

  private toTaskDto(task: Task): TaskDto {
    return {
      id: task.id,
      name: task.name,
      icon: task.icon,
      description: task.description,
      user_id: task.user_id,
      status: task.status,
      progress: task.progress,
      type: task.type,
      params: task.params
        ? typeof task.params === 'string'
          ? JSON.parse(task.params)
          : task.params
        : undefined,
      rewardId: task.rewardId,
      taskGroupId: task.taskGroupId,
      dueDate: task.dueDate || undefined,
      error: task.error || undefined,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      user: task.user
        ? {
            id: task.user.id,
            username: task.user.username,
            nickname: task.user.nickname,
            avatar: task.user.avatar,
          }
        : undefined,
    };
  }

  async create(createDto: CreateTaskDto): Promise<TaskDto> {
    const task = new Task();
    Object.assign(task, {
      ...createDto,
      params: createDto.params || {},
    });
    const saved = await this.taskRepo.save(task);
    return this.toTaskDto(saved);
  }

  async findAll(
    userId: string,
    query: TaskQueryDto,
  ): Promise<PaginatedResponseDto<TaskDto>> {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);

    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
      throw new Error('Invalid page or limit parameters');
    }

    const where: any = { user_id: userId };
    if (query.name) {
      where.name = Like(`%${query.name}%`);
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.type) {
      where.type = query.type;
    }

    const [tasks, total] = await this.taskRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: {
        user: true,
      },
    });

    return {
      list: tasks.map((task) => this.toTaskDto(task)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string, userId: string): Promise<TaskDto> {
    const task = await this.taskRepo.findOne({
      where: { id, user_id: userId },
      relations: {
        user: true,
      },
    });
    if (!task) {
      throw new Error('Task not found');
    }
    return this.toTaskDto(task);
  }

  async update(
    id: string,
    updateDto: Partial<CreateTaskDto>,
  ): Promise<TaskDto> {
    const task = await this.taskRepo.findOne({ where: { id } });
    if (!task) {
      throw new Error('Task not found');
    }

    Object.assign(task, {
      ...updateDto,
      params: updateDto.params || task.params,
    });
    const saved = await this.taskRepo.save(task);
    return this.toTaskDto(saved);
  }

  async remove(id: string, userId: string): Promise<void> {
    const task = await this.taskRepo.findOne({
      where: { id, user_id: userId },
    });
    if (task && task.type === TaskType.CRON) {
      await this.taskScheduler.unscheduleTask(id);
    }
    if (task) await this.taskRepo.remove(task);
  }

  async getTodayTasks(
    userId: string,
    query: TaskQueryDto,
  ): Promise<PaginatedResponseDto<TaskDto>> {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);

    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
      throw new Error('Invalid page or limit parameters');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where: any = {
      user_id: userId,
      dueDate: Between(today, tomorrow),
    };
    if (query.name) {
      where.name = Like(`%${query.name}%`);
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.type) {
      where.type = query.type;
    }

    const [tasks, total] = await this.taskRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { dueDate: 'ASC' },
      relations: {
        user: true,
      },
    });

    return {
      list: tasks.map((task) => this.toTaskDto(task)),
      total,
      page,
      limit,
    };
  }

  async getWeekTasks(
    userId: string,
    query: TaskQueryDto,
  ): Promise<PaginatedResponseDto<TaskDto>> {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);

    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
      throw new Error('Invalid page or limit parameters');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const where: any = {
      user_id: userId,
      dueDate: Between(startOfWeek, endOfWeek),
    };
    if (query.name) {
      where.name = Like(`%${query.name}%`);
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.type) {
      where.type = query.type;
    }

    const [tasks, total] = await this.taskRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { dueDate: 'ASC' },
      relations: {
        user: true,
      },
    });

    return {
      list: tasks.map((task) => this.toTaskDto(task)),
      total,
      page,
      limit,
    };
  }

  async getMonthTasks(
    userId: string,
    query: TaskQueryDto,
  ): Promise<PaginatedResponseDto<TaskDto>> {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);

    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
      throw new Error('Invalid page or limit parameters');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const where: any = {
      user_id: userId,
      dueDate: Between(startOfMonth, endOfMonth),
    };
    if (query.name) {
      where.name = Like(`%${query.name}%`);
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.type) {
      where.type = query.type;
    }

    const [tasks, total] = await this.taskRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { dueDate: 'ASC' },
      relations: {
        user: true,
      },
    });

    return {
      list: tasks.map((task) => this.toTaskDto(task)),
      total,
      page,
      limit,
    };
  }

  async updateTaskStatus(
    id: string,
    userId: string,
    status: TaskStatus,
  ): Promise<TaskDto> {
    const task = await this.taskRepo.findOne({
      where: { id, user_id: userId },
    });
    if (!task) {
      throw new Error('Task not found');
    }

    if (!this.isValidStatusTransition(task.status, status)) {
      throw new Error(
        `Invalid status transition from ${task.status} to ${status}`,
      );
    }

    task.status = status;
    const saved = await this.taskRepo.save(task);
    return this.toTaskDto(saved);
  }

  private isValidStatusTransition(
    currentStatus: TaskStatus,
    newStatus: TaskStatus,
  ): boolean {
    // 定义合法的状态转换
    const validTransitions: Record<TaskStatus, TaskStatus[]> = {
      [TaskStatus.PENDING]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
      [TaskStatus.IN_PROGRESS]: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      [TaskStatus.COMPLETED]: [], // 已完成状态不能转换
      [TaskStatus.CANCELLED]: [], // 已取消状态不能转换
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }
}
