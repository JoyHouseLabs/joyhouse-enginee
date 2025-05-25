import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TaskService } from './task.service';
import { TaskCreateDto } from './task-create.dto';
import { TaskUpdateDto } from './task-update.dto';
import { TaskQueryDto } from './task-query.dto';
import { PaginatedResponseDto, TaskDto, CreateTaskDto } from './task.dto';
import { TaskStatus, TaskType } from './task-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../decorators/user.decorator';

@ApiTags('tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @ApiOperation({ summary: '创建任务' })
  @ApiResponse({ status: 201, type: TaskDto })
  create(
    @User('id') userId: string,
    @Body() dto: TaskCreateDto,
  ): Promise<TaskDto> {
    const createDto: CreateTaskDto = {
      name: dto.name,
      icon: dto.icon || '',
      description: dto.description,
      userId: userId,
      status: dto.status || TaskStatus.PENDING,
      progress: dto.progress,
      type: dto.type || TaskType.CUSTOM,
      params: dto.params,
      rewardId: dto.rewardId,
      taskGroupId: dto.taskGroupId,
      dueDate: dto.dueDate,
    };
    return this.taskService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: '获取任务列表' })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  findAll(
    @User('id') userId: string,
    @Query() query: TaskQueryDto,
  ): Promise<PaginatedResponseDto<TaskDto>> {
    return this.taskService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取任务详情' })
  @ApiResponse({ status: 200, type: TaskDto })
  findOne(
    @User('id') userId: string,
    @Param('id') id: string,
  ): Promise<TaskDto> {
    return this.taskService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新任务' })
  @ApiResponse({ status: 200, type: TaskDto })
  update(
    @User('id') userId: string,
    @Param('id') id: string,
    @Body() dto: TaskUpdateDto,
  ): Promise<TaskDto> {
    const updateDto: Partial<CreateTaskDto> = {
      name: dto.name,
      icon: dto.icon,
      description: dto.description,
      status: dto.status,
      progress: dto.progress,
      type: dto.type,
      params: dto.params,
      rewardId: dto.rewardId,
      taskGroupId: dto.taskGroupId,
      dueDate: dto.dueDate,
      userId: userId,
    };
    return this.taskService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除任务' })
  @ApiResponse({ status: 200 })
  remove(@User('id') userId: string, @Param('id') id: string): Promise<void> {
    return this.taskService.remove(id, userId);
  }

  @Post('start/:id')
  @ApiOperation({ summary: '开始任务' })
  @ApiResponse({ status: 200, type: TaskDto })
  startTask(
    @User('id') userId: string,
    @Param('id') id: string,
  ): Promise<TaskDto> {
    return this.taskService.updateTaskStatus(
      id,
      userId,
      TaskStatus.IN_PROGRESS,
    );
  }

  @Post('end/:id')
  @ApiOperation({ summary: '结束任务' })
  @ApiResponse({ status: 200, type: TaskDto })
  endTask(
    @User('id') userId: string,
    @Param('id') id: string,
  ): Promise<TaskDto> {
    return this.taskService.updateTaskStatus(id, userId, TaskStatus.COMPLETED);
  }

  @Get('today')
  @ApiOperation({ summary: '获取今日任务' })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  getTodayTasks(
    @User('id') userId: string,
    @Query() query: TaskQueryDto,
  ): Promise<PaginatedResponseDto<TaskDto>> {
    return this.taskService.getTodayTasks(userId, query);
  }

  @Get('week')
  @ApiOperation({ summary: '获取本周任务' })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  getWeekTasks(
    @User('id') userId: string,
    @Query() query: TaskQueryDto,
  ): Promise<PaginatedResponseDto<TaskDto>> {
    return this.taskService.getWeekTasks(userId, query);
  }

  @Get('month')
  @ApiOperation({ summary: '获取本月任务' })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  getMonthTasks(
    @User('id') userId: string,
    @Query() query: TaskQueryDto,
  ): Promise<PaginatedResponseDto<TaskDto>> {
    return this.taskService.getMonthTasks(userId, query);
  }
}
