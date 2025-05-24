import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  CollaborationRoom,
  RoomStatus,
} from '../entities/collaboration-room.entity';
import {
  CollaborationTask,
  TaskStatus,
} from '../entities/collaboration-task.entity';
import { CollaborationMessage } from '../entities/collaboration-message.entity';
import { SpecializedAgent } from '../entities/specialized-agent.entity';
import { TaskEvaluation } from '../entities/task-evaluation.entity';
import { CollaborationEngineService } from '../services/collaboration-engine.service';
import {
  CreateCollaborationRoomDto,
  CreateCollaborationTaskDto,
  SendMessageDto,
  CreateSpecializedAgentDto,
  TaskFeedbackDto,
  EvaluationRequestDto,
} from '../dto/collaboration.dto';

@ApiTags('collaboration')
@Controller('collaboration')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CollaborationController {
  constructor(
    @InjectRepository(CollaborationRoom)
    private readonly roomRepo: Repository<CollaborationRoom>,
    @InjectRepository(CollaborationTask)
    private readonly taskRepo: Repository<CollaborationTask>,
    @InjectRepository(CollaborationMessage)
    private readonly messageRepo: Repository<CollaborationMessage>,
    @InjectRepository(SpecializedAgent)
    private readonly specializedAgentRepo: Repository<SpecializedAgent>,
    @InjectRepository(TaskEvaluation)
    private readonly evaluationRepo: Repository<TaskEvaluation>,
    private readonly collaborationEngine: CollaborationEngineService,
  ) {}

  // 房间管理

  @Post('rooms')
  @ApiOperation({ summary: 'Create a new collaboration room' })
  @ApiResponse({ status: 201, description: 'Room created successfully' })
  async createRoom(
    @Body() createRoomDto: CreateCollaborationRoomDto,
    @Request() req,
  ) {
    const room = this.roomRepo.create({
      name: createRoomDto.name,
      description: createRoomDto.description,
      creator: req.user,
      participants: createRoomDto.participantIds.map((id) => ({ id })),
      agents: createRoomDto.agentIds.map((id) => ({ id })),
      settings: createRoomDto.settings,
      status: RoomStatus.ACTIVE,
    });

    return await this.roomRepo.save(room);
  }

  @Get('rooms')
  @ApiOperation({ summary: 'Get user collaboration rooms' })
  @ApiResponse({ status: 200, description: 'Rooms retrieved successfully' })
  async getUserRooms(@Request() req, @Query('status') status?: RoomStatus) {
    const queryBuilder = this.roomRepo
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.creator', 'creator')
      .leftJoinAndSelect('room.participants', 'participants')
      .leftJoinAndSelect('room.agents', 'agents')
      .leftJoinAndSelect('room.tasks', 'tasks')
      .where('creator.id = :userId OR participants.id = :userId', {
        userId: req.user.id,
      });

    if (status) {
      queryBuilder.andWhere('room.status = :status', { status });
    }

    return await queryBuilder.orderBy('room.updatedAt', 'DESC').getMany();
  }

  @Get('rooms/:id')
  @ApiOperation({ summary: 'Get room details' })
  @ApiResponse({
    status: 200,
    description: 'Room details retrieved successfully',
  })
  async getRoomDetails(@Param('id') roomId: string, @Request() req) {
    const room = await this.roomRepo.findOne({
      where: { id: roomId },
      relations: [
        'creator',
        'participants',
        'agents',
        'tasks',
        'messages',
        'documents',
      ],
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // 检查权限
    const hasPermission =
      room.creator.id === req.user.id ||
      room.participants.some((p) => p.id === req.user.id);

    if (!hasPermission) {
      throw new BadRequestException('No permission to access this room');
    }

    return room;
  }

  @Put('rooms/:id')
  @ApiOperation({ summary: 'Update room settings' })
  @ApiResponse({ status: 200, description: 'Room updated successfully' })
  async updateRoom(
    @Param('id') roomId: string,
    @Body() updateData: Partial<CreateCollaborationRoomDto>,
    @Request() req,
  ) {
    const room = await this.roomRepo.findOne({
      where: { id: roomId },
      relations: ['creator'],
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (room.creator.id !== req.user.id) {
      throw new BadRequestException(
        'Only room creator can update room settings',
      );
    }

    Object.assign(room, updateData);
    return await this.roomRepo.save(room);
  }

  @Delete('rooms/:id')
  @ApiOperation({ summary: 'Delete collaboration room' })
  @ApiResponse({ status: 200, description: 'Room deleted successfully' })
  async deleteRoom(@Param('id') roomId: string, @Request() req) {
    const room = await this.roomRepo.findOne({
      where: { id: roomId },
      relations: ['creator'],
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (room.creator.id !== req.user.id) {
      throw new BadRequestException('Only room creator can delete room');
    }

    await this.roomRepo.remove(room);
    return { message: 'Room deleted successfully' };
  }

  // 任务管理

  @Post('tasks')
  @ApiOperation({ summary: 'Create a new collaboration task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  async createTask(
    @Body() createTaskDto: CreateCollaborationTaskDto,
    @Request() req,
  ) {
    return await this.collaborationEngine.createTask(createTaskDto, req.user);
  }

  @Get('tasks')
  @ApiOperation({ summary: 'Get user tasks' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  async getUserTasks(
    @Request() req,
    @Query('status') status?: TaskStatus,
    @Query('roomId') roomId?: string,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ) {
    const queryBuilder = this.taskRepo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.room', 'room')
      .leftJoinAndSelect('task.creator', 'creator')
      .leftJoinAndSelect('task.steps', 'steps')
      .leftJoinAndSelect('task.evaluations', 'evaluations')
      .leftJoinAndSelect('room.participants', 'participants')
      .where('creator.id = :userId OR participants.id = :userId', {
        userId: req.user.id,
      });

    if (status) {
      queryBuilder.andWhere('task.status = :status', { status });
    }

    if (roomId) {
      queryBuilder.andWhere('room.id = :roomId', { roomId });
    }

    return await queryBuilder
      .orderBy('task.createdAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getMany();
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get task details' })
  @ApiResponse({
    status: 200,
    description: 'Task details retrieved successfully',
  })
  async getTaskDetails(@Param('id') taskId: string, @Request() req) {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: [
        'room',
        'room.participants',
        'creator',
        'coordinatorAgent',
        'requirementAnalysisAgent',
        'workAgent',
        'steps',
        'steps.assignedAgent',
        'evaluations',
        'evaluations.evaluatorAgent',
      ],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // 检查权限
    const hasPermission =
      task.creator.id === req.user.id ||
      task.room.participants.some((p) => p.id === req.user.id);

    if (!hasPermission) {
      throw new BadRequestException('No permission to access this task');
    }

    return task;
  }

  @Post('tasks/:id/feedback')
  @ApiOperation({ summary: 'Provide feedback on task requirement analysis' })
  @ApiResponse({ status: 200, description: 'Feedback submitted successfully' })
  async submitTaskFeedback(
    @Param('id') taskId: string,
    @Body() feedback: TaskFeedbackDto,
    @Request() req,
  ) {
    await this.collaborationEngine.handleRequirementFeedback(
      taskId,
      feedback,
      req.user,
    );
    return { message: 'Feedback submitted successfully' };
  }

  @Post('tasks/:id/cancel')
  @ApiOperation({ summary: 'Cancel task execution' })
  @ApiResponse({ status: 200, description: 'Task cancelled successfully' })
  async cancelTask(@Param('id') taskId: string, @Request() req) {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ['creator', 'room', 'room.participants'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // 检查权限
    const hasPermission =
      task.creator.id === req.user.id ||
      task.room.participants.some((p) => p.id === req.user.id);

    if (!hasPermission) {
      throw new BadRequestException('No permission to cancel this task');
    }

    task.status = TaskStatus.CANCELLED;
    await this.taskRepo.save(task);

    return { message: 'Task cancelled successfully' };
  }

  // 消息管理

  @Get('rooms/:roomId/messages')
  @ApiOperation({ summary: 'Get room messages' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  async getRoomMessages(
    @Param('roomId') roomId: string,
    @Request() req,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
    @Query('before') before?: string,
  ) {
    // 验证权限
    const room = await this.roomRepo.findOne({
      where: { id: roomId },
      relations: ['creator', 'participants'],
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const hasPermission =
      room.creator.id === req.user.id ||
      room.participants.some((p) => p.id === req.user.id);

    if (!hasPermission) {
      throw new BadRequestException('No permission to access room messages');
    }

    const queryBuilder = this.messageRepo
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.user', 'user')
      .leftJoinAndSelect('message.agent', 'agent')
      .leftJoinAndSelect('message.relatedTask', 'relatedTask')
      .where('message.room.id = :roomId', { roomId });

    if (before) {
      queryBuilder.andWhere('message.createdAt < :before', {
        before: new Date(before),
      });
    }

    return await queryBuilder
      .orderBy('message.createdAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getMany();
  }

  // 专业化Agent管理

  @Post('agents')
  @ApiOperation({ summary: 'Create a specialized agent' })
  @ApiResponse({
    status: 201,
    description: 'Specialized agent created successfully',
  })
  async createSpecializedAgent(
    @Body() createAgentDto: CreateSpecializedAgentDto,
    @Request() req,
  ) {
    const specializedAgent = this.specializedAgentRepo.create({
      baseAgent: { id: createAgentDto.baseAgentId },
      role: createAgentDto.role,
      specialization: createAgentDto.specialization,
      owner: req.user,
      capabilities: createAgentDto.capabilities,
      configuration: createAgentDto.configuration,
      maxLoad: createAgentDto.maxLoad || 5,
      isActive: true,
      isAvailable: true,
      currentLoad: 0,
    });

    return await this.specializedAgentRepo.save(specializedAgent);
  }

  @Get('agents')
  @ApiOperation({ summary: 'Get user specialized agents' })
  @ApiResponse({
    status: 200,
    description: 'Specialized agents retrieved successfully',
  })
  async getUserSpecializedAgents(@Request() req, @Query('role') role?: string) {
    const queryBuilder = this.specializedAgentRepo
      .createQueryBuilder('agent')
      .leftJoinAndSelect('agent.baseAgent', 'baseAgent')
      .leftJoinAndSelect('agent.owner', 'owner')
      .where('owner.id = :userId', { userId: req.user.id });

    if (role) {
      queryBuilder.andWhere('agent.role = :role', { role });
    }

    return await queryBuilder.orderBy('agent.createdAt', 'DESC').getMany();
  }

  @Get('agents/:id')
  @ApiOperation({ summary: 'Get specialized agent details' })
  @ApiResponse({
    status: 200,
    description: 'Agent details retrieved successfully',
  })
  async getSpecializedAgentDetails(
    @Param('id') agentId: string,
    @Request() req,
  ) {
    const agent = await this.specializedAgentRepo.findOne({
      where: { id: agentId },
      relations: ['baseAgent', 'owner'],
    });

    if (!agent) {
      throw new NotFoundException('Specialized agent not found');
    }

    if (agent.owner.id !== req.user.id) {
      throw new BadRequestException('No permission to access this agent');
    }

    return agent;
  }

  @Put('agents/:id')
  @ApiOperation({ summary: 'Update specialized agent' })
  @ApiResponse({ status: 200, description: 'Agent updated successfully' })
  async updateSpecializedAgent(
    @Param('id') agentId: string,
    @Body() updateData: Partial<CreateSpecializedAgentDto>,
    @Request() req,
  ) {
    const agent = await this.specializedAgentRepo.findOne({
      where: { id: agentId },
      relations: ['owner'],
    });

    if (!agent) {
      throw new NotFoundException('Specialized agent not found');
    }

    if (agent.owner.id !== req.user.id) {
      throw new BadRequestException('No permission to update this agent');
    }

    Object.assign(agent, updateData);
    return await this.specializedAgentRepo.save(agent);
  }

  @Delete('agents/:id')
  @ApiOperation({ summary: 'Delete specialized agent' })
  @ApiResponse({ status: 200, description: 'Agent deleted successfully' })
  async deleteSpecializedAgent(@Param('id') agentId: string, @Request() req) {
    const agent = await this.specializedAgentRepo.findOne({
      where: { id: agentId },
      relations: ['owner'],
    });

    if (!agent) {
      throw new NotFoundException('Specialized agent not found');
    }

    if (agent.owner.id !== req.user.id) {
      throw new BadRequestException('No permission to delete this agent');
    }

    await this.specializedAgentRepo.remove(agent);
    return { message: 'Specialized agent deleted successfully' };
  }

  // 评估管理

  @Post('evaluations')
  @ApiOperation({ summary: 'Request task evaluation' })
  @ApiResponse({
    status: 201,
    description: 'Evaluation requested successfully',
  })
  async requestEvaluation(
    @Body() evaluationRequest: EvaluationRequestDto,
    @Request() req,
  ) {
    const task = await this.taskRepo.findOne({
      where: { id: evaluationRequest.taskId },
      relations: ['creator', 'room', 'room.participants'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // 检查权限
    const hasPermission =
      task.creator.id === req.user.id ||
      task.room.participants.some((p) => p.id === req.user.id);

    if (!hasPermission) {
      throw new BadRequestException(
        'No permission to request evaluation for this task',
      );
    }

    // 创建评估请求
    const evaluations: TaskEvaluation[] = [];
    for (const agentId of evaluationRequest.evaluatorAgentIds) {
      const evaluation = this.evaluationRepo.create({
        task,
        evaluatorAgent: { id: agentId },
      });
      const savedEvaluation = await this.evaluationRepo.save(evaluation);
      evaluations.push(savedEvaluation);
    }

    return evaluations;
  }

  @Get('tasks/:taskId/evaluations')
  @ApiOperation({ summary: 'Get task evaluations' })
  @ApiResponse({
    status: 200,
    description: 'Evaluations retrieved successfully',
  })
  async getTaskEvaluations(@Param('taskId') taskId: string, @Request() req) {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ['creator', 'room', 'room.participants'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // 检查权限
    const hasPermission =
      task.creator.id === req.user.id ||
      task.room.participants.some((p) => p.id === req.user.id);

    if (!hasPermission) {
      throw new BadRequestException('No permission to access task evaluations');
    }

    return await this.evaluationRepo.find({
      where: { task: { id: taskId } },
      relations: ['evaluatorAgent'],
      order: { createdAt: 'DESC' },
    });
  }

  // 统计信息

  @Get('stats/overview')
  @ApiOperation({ summary: 'Get collaboration overview statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getOverviewStats(@Request() req) {
    const userId = req.user.id;

    const [
      totalRooms,
      activeRooms,
      totalTasks,
      completedTasks,
      activeTasks,
      failedTasks,
    ] = await Promise.all([
      this.roomRepo
        .createQueryBuilder('room')
        .leftJoin('room.participants', 'participants')
        .where('room.creator.id = :userId OR participants.id = :userId', {
          userId,
        })
        .getCount(),

      this.roomRepo
        .createQueryBuilder('room')
        .leftJoin('room.participants', 'participants')
        .where('room.creator.id = :userId OR participants.id = :userId', {
          userId,
        })
        .andWhere('room.status = :status', { status: RoomStatus.ACTIVE })
        .getCount(),

      this.taskRepo
        .createQueryBuilder('task')
        .leftJoin('task.room', 'room')
        .leftJoin('room.participants', 'participants')
        .where('task.creator.id = :userId OR participants.id = :userId', {
          userId,
        })
        .getCount(),

      this.taskRepo
        .createQueryBuilder('task')
        .leftJoin('task.room', 'room')
        .leftJoin('room.participants', 'participants')
        .where('task.creator.id = :userId OR participants.id = :userId', {
          userId,
        })
        .andWhere('task.status = :status', { status: TaskStatus.COMPLETED })
        .getCount(),

      this.taskRepo
        .createQueryBuilder('task')
        .leftJoin('task.room', 'room')
        .leftJoin('room.participants', 'participants')
        .where('task.creator.id = :userId OR participants.id = :userId', {
          userId,
        })
        .andWhere('task.status IN (:...statuses)', {
          statuses: [
            TaskStatus.PENDING,
            TaskStatus.REQUIREMENT_ANALYSIS,
            TaskStatus.PLANNING,
            TaskStatus.EXECUTION,
            TaskStatus.EVALUATION,
          ],
        })
        .getCount(),

      this.taskRepo
        .createQueryBuilder('task')
        .leftJoin('task.room', 'room')
        .leftJoin('room.participants', 'participants')
        .where('task.creator.id = :userId OR participants.id = :userId', {
          userId,
        })
        .andWhere('task.status = :status', { status: TaskStatus.FAILED })
        .getCount(),
    ]);

    return {
      rooms: {
        total: totalRooms,
        active: activeRooms,
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        active: activeTasks,
        failed: failedTasks,
        successRate:
          totalTasks > 0
            ? ((completedTasks / totalTasks) * 100).toFixed(1)
            : '0',
      },
    };
  }
}
