import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TaskGroupService } from './task-group.service';
import {
  CreateTaskGroupDto,
  UpdateTaskGroupDto,
  TaskGroupDto,
  TaskGroupQueryDto,
} from './task-group.dto';

@ApiTags('task-groups')
@Controller('task-groups')
export class TaskGroupController {
  constructor(private readonly taskGroupService: TaskGroupService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task group' })
  @ApiResponse({
    status: 201,
    description: 'The task group has been successfully created.',
    type: TaskGroupDto,
  })
  async create(@Body() createDto: CreateTaskGroupDto): Promise<TaskGroupDto> {
    return this.taskGroupService.create(createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a task group' })
  @ApiResponse({
    status: 200,
    description: 'The task group has been successfully updated.',
    type: TaskGroupDto,
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTaskGroupDto,
  ): Promise<TaskGroupDto> {
    updateDto.id = id;
    return this.taskGroupService.update(updateDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task group by id' })
  @ApiResponse({
    status: 200,
    description: 'Return the task group.',
    type: TaskGroupDto,
  })
  async findOne(@Param('id') id: string): Promise<TaskGroupDto> {
    return this.taskGroupService.findOne(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all task groups' })
  @ApiResponse({
    status: 200,
    description: 'Return all task groups.',
    type: [TaskGroupDto],
  })
  async findAll(@Query() query: TaskGroupQueryDto): Promise<TaskGroupDto[]> {
    return this.taskGroupService.findAll(query);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除任务组' })
  @ApiResponse({ status: 200 })
  remove(@Param('id') id: string): Promise<void> {
    return this.taskGroupService.remove(id);
  }

  @Post(':groupId/task-items/:taskItemId')
  @ApiOperation({ summary: 'Add a task item to a task group' })
  @ApiResponse({
    status: 200,
    description: 'The task item has been successfully added to the task group.',
    type: TaskGroupDto,
  })
  async addTaskItem(
    @Param('groupId') groupId: string,
    @Param('taskItemId') taskItemId: string,
  ): Promise<TaskGroupDto> {
    return this.taskGroupService.addTaskItem(groupId, taskItemId);
  }

  @Delete(':groupId/task-items/:taskItemId')
  @ApiOperation({ summary: 'Remove a task item from a task group' })
  @ApiResponse({
    status: 200,
    description:
      'The task item has been successfully removed from the task group.',
    type: TaskGroupDto,
  })
  async removeTaskItem(
    @Param('groupId') groupId: string,
    @Param('taskItemId') taskItemId: string,
  ): Promise<TaskGroupDto> {
    return this.taskGroupService.removeTaskItem(groupId, taskItemId);
  }
}
