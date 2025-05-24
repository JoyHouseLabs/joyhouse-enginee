import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TaskItemService } from './task-item.service';
import { CreateTaskItemDto, UpdateTaskItemDto, TaskItemDto, TaskItemQueryDto } from './task-item.dto';

@ApiTags('task-items')
@Controller('task-items')
export class TaskItemController {
  constructor(private readonly taskItemService: TaskItemService) {}

  @Post()
  @ApiOperation({ summary: '创建任务项' })
  @ApiResponse({ status: 201, type: TaskItemDto })
  create(@Body() createDto: CreateTaskItemDto): Promise<TaskItemDto> {
    return this.taskItemService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: '获取任务项列表' })
  @ApiResponse({ status: 200, type: [TaskItemDto] })
  findAll(@Query() query: TaskItemQueryDto): Promise<TaskItemDto[]> {
    return this.taskItemService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取任务项详情' })
  @ApiResponse({ status: 200, type: TaskItemDto })
  findOne(@Param('id') id: string): Promise<TaskItemDto> {
    return this.taskItemService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新任务项' })
  @ApiResponse({ status: 200, type: TaskItemDto })
  update(@Param('id') id: string, @Body() updateDto: UpdateTaskItemDto): Promise<TaskItemDto> {
    return this.taskItemService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除任务项' })
  @ApiResponse({ status: 200 })
  remove(@Param('id') id: string): Promise<void> {
    return this.taskItemService.remove(id);
  }

  @Get('group/:taskGroupId')
  @ApiOperation({ summary: 'Get all task items in a task group' })
  @ApiResponse({ status: 200, description: 'Return all task items in the task group.', type: [TaskItemDto] })
  async findByTaskGroup(@Param('taskGroupId') taskGroupId: string): Promise<TaskItemDto[]> {
    return this.taskItemService.findByTaskGroup(taskGroupId);
  }
} 