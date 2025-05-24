import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserTaskService } from './user-task.service';
import { Task } from './task.entity';
import { TaskItem } from './task-item.entity';
import { TaskDto } from './task.dto';
import { User } from '../decorators/user.decorator';
import { TaskType } from './task-query.dto';

@ApiTags('user-tasks')
@Controller('user-tasks')
export class UserTaskController {
  constructor(private readonly userTaskService: UserTaskService) {}

  @Post('from-group/:groupId')
  @ApiOperation({ summary: '从任务组创建用户任务' })
  @ApiResponse({ status: 201, description: '成功创建用户任务', type: [Task] })
  async createTasksFromGroup(
    @Param('groupId') groupId: string,
    @Body('userId') userId: string,
  ): Promise<Task[]> {
    return this.userTaskService.createTasksFromGroup(userId, groupId);
  }

  @Post('from-item/:itemId')
  @ApiOperation({ summary: '从任务项模板创建用户任务' })
  @ApiResponse({ status: 201, description: '成功创建用户任务', type: Task })
  async createTaskFromItem(
    @Param('itemId') itemId: string,
    @Body('userId') userId: string,
  ): Promise<Task> {
    const taskItem = await this.userTaskService.taskItemService.findOne(itemId);
    return this.userTaskService.createTaskFromTemplate(userId, taskItem);
  }

  @Post('from-template/:itemId')
  @ApiOperation({ summary: '从模板创建任务' })
  @ApiResponse({ status: 201, type: TaskDto })
  async createFromTemplate(@User('id') userId: string, @Param('itemId') itemId: string): Promise<TaskDto> {
    const taskItem = await this.userTaskService.taskItemService.findOne(itemId);
    if (!taskItem) {
      throw new Error('Task item not found');
    }

    return this.userTaskService.createTaskFromTemplate(userId, taskItem);
  }

  @Put(':taskId/progress')
  @ApiOperation({ summary: '更新任务进度' })
  @ApiResponse({ status: 200, description: '成功更新任务进度', type: Task })
  async updateTaskProgress(
    @Param('taskId') taskId: string,
    @Body('userId') userId: string,
    @Body('progress') progress: number,
  ): Promise<Task> {
    return this.userTaskService.updateTaskProgress(taskId, userId, progress);
  }

  @Get('progress')
  @ApiOperation({ summary: '获取用户任务进度' })
  @ApiResponse({ status: 200, description: '返回用户任务进度' })
  async getUserTaskProgress(
    @Query('userId') userId: string,
    @Query('taskGroupId') taskGroupId?: string,
  ) {
    return this.userTaskService.getUserTaskProgress(userId, taskGroupId);
  }
} 