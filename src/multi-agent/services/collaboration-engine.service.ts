import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CollaborationRoom,
  RoomStatus,
} from '../entities/collaboration-room.entity';
import {
  CollaborationTask,
  TaskStatus,
  TaskType,
} from '../entities/collaboration-task.entity';
import { TaskStep, StepType, StepStatus } from '../entities/task-step.entity';
import {
  TaskEvaluation,
  EvaluationStatus,
  EvaluationResult,
} from '../entities/task-evaluation.entity';
import {
  SpecializedAgent,
  AgentRole,
} from '../entities/specialized-agent.entity';
import {
  CollaborationMessage,
  MessageType,
  SenderType,
} from '../entities/collaboration-message.entity';
import { User } from '../../user/user.entity';
import { Agent } from '../../agent/entities/agent.entity';
import { AgentService } from '../../agent/agent.service';
import { LlmService } from '../../llm/llm.service';
import { ToolService } from '../../tool/tool.service';
import { WorkflowService } from '../../workflow/workflow.service';
import {
  CreateCollaborationTaskDto,
  TaskFeedbackDto,
} from '../dto/collaboration.dto';

interface TaskExecutionContext {
  task: CollaborationTask;
  room: CollaborationRoom;
  currentStep?: TaskStep;
  messages: CollaborationMessage[];
  documents: any[];
  variables: Record<string, any>;
}

@Injectable()
export class CollaborationEngineService {
  private readonly logger = new Logger(CollaborationEngineService.name);

  constructor(
    @InjectRepository(CollaborationRoom)
    private readonly roomRepo: Repository<CollaborationRoom>,
    @InjectRepository(CollaborationTask)
    private readonly taskRepo: Repository<CollaborationTask>,
    @InjectRepository(TaskStep)
    private readonly stepRepo: Repository<TaskStep>,
    @InjectRepository(TaskEvaluation)
    private readonly evaluationRepo: Repository<TaskEvaluation>,
    @InjectRepository(SpecializedAgent)
    private readonly specializedAgentRepo: Repository<SpecializedAgent>,
    @InjectRepository(CollaborationMessage)
    private readonly messageRepo: Repository<CollaborationMessage>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    private readonly eventEmitter: EventEmitter2,
    private readonly agentService: AgentService,
    private readonly llmService: LlmService,
    private readonly toolService: ToolService,
    private readonly workflowService: WorkflowService,
  ) {}

  /**
   * 创建协同任务并启动执行流程
   */
  async createTask(
    createTaskDto: CreateCollaborationTaskDto,
    creator: User,
  ): Promise<CollaborationTask> {
    const room = await this.roomRepo.findOne({
      where: { id: createTaskDto.roomId },
      relations: ['participants', 'agents', 'creator'],
    });

    if (!room) {
      throw new NotFoundException('Collaboration room not found');
    }

    // 检查用户是否有权限在此房间创建任务
    const hasPermission =
      room.creator.id === creator.id ||
      room.participants.some((p) => p.id === creator.id);

    if (!hasPermission) {
      throw new BadRequestException(
        'No permission to create task in this room',
      );
    }

    // 创建任务
    const task = this.taskRepo.create({
      title: createTaskDto.title,
      originalRequirement: createTaskDto.originalRequirement,
      type: createTaskDto.type,
      priority: createTaskDto.priority,
      room,
      creator,
      status: TaskStatus.PENDING,
      context: createTaskDto.context,
      deadline: createTaskDto.deadline,
    });

    const savedTask = await this.taskRepo.save(task);

    // 发送任务创建消息到房间
    await this.sendSystemMessage(room.id, {
      content: `新任务已创建: ${task.title}`,
      type: MessageType.SYSTEM,
      relatedTask: savedTask,
      metadata: {
        taskId: savedTask.id,
        taskType: savedTask.type,
        priority: savedTask.priority,
      },
    });

    // 启动任务执行流程
    await this.startTaskExecution(savedTask);

    return savedTask;
  }

  /**
   * 启动任务执行流程
   */
  async startTaskExecution(task: CollaborationTask): Promise<void> {
    this.logger.log(`Starting task execution: ${task.id}`);

    // 更新任务状态
    task.status = TaskStatus.REQUIREMENT_ANALYSIS;
    task.startedAt = new Date();
    await this.taskRepo.save(task);

    // 发射任务开始事件
    this.eventEmitter.emit('collaboration.task.started', {
      taskId: task.id,
      roomId: task.room.id,
      taskType: task.type,
      timestamp: new Date(),
    });

    // 第一步：需求分析
    await this.executeRequirementAnalysis(task);
  }

  /**
   * 执行需求分析阶段
   */
  private async executeRequirementAnalysis(
    task: CollaborationTask,
  ): Promise<void> {
    this.logger.log(`Executing requirement analysis for task: ${task.id}`);

    // 选择需求分析Agent
    const requirementAgent = await this.selectRequirementAnalysisAgent(task);
    if (!requirementAgent) {
      throw new Error('No requirement analysis agent available');
    }

    // 创建需求分析步骤
    const step = this.stepRepo.create({
      name: '需求分析',
      description: '分析和扩展用户需求',
      type: StepType.REQUIREMENT_ANALYSIS,
      status: StepStatus.IN_PROGRESS,
      order: 1,
      task,
      assignedAgent: requirementAgent.baseAgent,
      input: task.originalRequirement,
      startedAt: new Date(),
    });

    await this.stepRepo.save(step);

    // 构建需求分析提示词
    const analysisPrompt = this.buildRequirementAnalysisPrompt(
      task,
      requirementAgent,
    );

    try {
      // 调用需求分析Agent
      const analysisResult = await this.callAgent(
        requirementAgent.baseAgent,
        analysisPrompt,
        task,
      );

      // 更新步骤结果
      step.status = StepStatus.COMPLETED;
      step.output = analysisResult.content;
      step.completedAt = new Date();
      await this.stepRepo.save(step);

      // 更新任务的分析需求
      task.analyzedRequirement = analysisResult.content;
      task.requirementAnalysisAgent = requirementAgent.baseAgent;
      task.status = TaskStatus.REQUIREMENT_CONFIRMATION;
      await this.taskRepo.save(task);

      // 发送需求分析结果到房间
      await this.sendAgentMessage(task.room.id, requirementAgent.baseAgent, {
        content: `我已完成需求分析，请查看分析结果：\n\n${analysisResult.content}`,
        type: MessageType.REQUIREMENT,
        relatedTask: task,
        mentions: [
          { type: 'user', id: task.creator.id, name: task.creator.username },
        ],
        metadata: {
          isApprovalRequest: true,
          requiresResponse: true,
          stepId: step.id,
        },
      });

      // 发射需求分析完成事件
      this.eventEmitter.emit('collaboration.requirement.analyzed', {
        taskId: task.id,
        stepId: step.id,
        agentId: requirementAgent.baseAgent.id,
        analysisResult: analysisResult.content,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Requirement analysis failed: ${error.message}`);
      step.status = StepStatus.FAILED;
      step.errorMessage = error.message;
      step.completedAt = new Date();
      await this.stepRepo.save(step);

      await this.handleTaskError(task, error.message);
    }
  }

  /**
   * 处理用户对需求分析的反馈
   */
  async handleRequirementFeedback(
    taskId: string,
    feedback: TaskFeedbackDto,
    user: User,
  ): Promise<void> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ['room', 'creator', 'requirementAnalysisAgent'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.status !== TaskStatus.REQUIREMENT_CONFIRMATION) {
      throw new BadRequestException(
        'Task is not in requirement confirmation stage',
      );
    }

    // 发送用户反馈消息
    await this.sendUserMessage(task.room.id, user, {
      content: feedback.feedback,
      type: MessageType.TEXT,
      relatedTask: task,
      metadata: {
        isApprovalResponse: true,
        approved: feedback.approved,
      },
    });

    if (feedback.approved) {
      // 用户确认需求，进入规划阶段
      task.status = TaskStatus.PLANNING;
      await this.taskRepo.save(task);

      await this.executePlanning(task);
    } else {
      // 用户要求修改需求，重新进行需求分析
      task.status = TaskStatus.REQUIREMENT_ANALYSIS;
      await this.taskRepo.save(task);

      // 将反馈发送给需求分析Agent
      const revisedPrompt = this.buildRequirementRevisionPrompt(
        task,
        feedback.feedback,
      );
      await this.executeRequirementAnalysis(task);
    }
  }

  /**
   * 执行规划阶段
   */
  private async executePlanning(task: CollaborationTask): Promise<void> {
    this.logger.log(`Executing planning for task: ${task.id}`);

    // 选择协调Agent
    const coordinatorAgent = await this.selectCoordinatorAgent(task);
    if (!coordinatorAgent) {
      throw new Error('No coordinator agent available');
    }

    // 创建规划步骤
    const step = this.stepRepo.create({
      name: '任务规划',
      description: '制定任务执行计划',
      type: StepType.PLANNING,
      status: StepStatus.IN_PROGRESS,
      order: 2,
      task,
      assignedAgent: coordinatorAgent.baseAgent,
      input: task.analyzedRequirement,
      startedAt: new Date(),
    });

    await this.stepRepo.save(step);

    // 构建规划提示词
    const planningPrompt = this.buildPlanningPrompt(task, coordinatorAgent);

    try {
      // 调用协调Agent进行规划
      const planningResult = await this.callAgent(
        coordinatorAgent.baseAgent,
        planningPrompt,
        task,
      );

      // 更新步骤和任务
      step.status = StepStatus.COMPLETED;
      step.output = planningResult.content;
      step.completedAt = new Date();
      await this.stepRepo.save(step);

      task.executionPlan = planningResult.content;
      task.coordinatorAgent = coordinatorAgent.baseAgent;
      task.status = TaskStatus.EXECUTION;
      await this.taskRepo.save(task);

      // 发送规划结果到房间
      await this.sendAgentMessage(task.room.id, coordinatorAgent.baseAgent, {
        content: `我已制定了执行计划：\n\n${planningResult.content}`,
        type: MessageType.PLAN,
        relatedTask: task,
        metadata: {
          stepId: step.id,
        },
      });

      // 开始执行阶段
      await this.executeTask(task);
    } catch (error) {
      this.logger.error(`Planning failed: ${error.message}`);
      step.status = StepStatus.FAILED;
      step.errorMessage = error.message;
      await this.stepRepo.save(step);

      await this.handleTaskError(task, error.message);
    }
  }

  /**
   * 执行任务阶段
   */
  private async executeTask(task: CollaborationTask): Promise<void> {
    this.logger.log(`Executing task: ${task.id}`);

    // 选择工作Agent
    const workAgent = await this.selectWorkAgent(task);
    if (!workAgent) {
      throw new Error('No work agent available');
    }

    // 创建执行步骤
    const step = this.stepRepo.create({
      name: '任务执行',
      description: '执行具体任务',
      type: StepType.EXECUTION,
      status: StepStatus.IN_PROGRESS,
      order: 3,
      task,
      assignedAgent: workAgent.baseAgent,
      input: task.executionPlan,
      startedAt: new Date(),
    });

    await this.stepRepo.save(step);

    // 构建执行提示词
    const executionPrompt = this.buildExecutionPrompt(task, workAgent);

    try {
      // 调用工作Agent执行任务
      const executionResult = await this.callAgent(
        workAgent.baseAgent,
        executionPrompt,
        task,
      );

      // 更新步骤和任务
      step.status = StepStatus.COMPLETED;
      step.output = executionResult.content;
      step.completedAt = new Date();
      await this.stepRepo.save(step);

      task.workAgent = workAgent.baseAgent;
      task.result = {
        output: executionResult.content,
        summary: '任务执行完成',
        metrics: {},
      };
      task.status = TaskStatus.EVALUATION;
      await this.taskRepo.save(task);

      // 发送执行结果到房间
      await this.sendAgentMessage(task.room.id, workAgent.baseAgent, {
        content: `我已完成任务执行，结果如下：\n\n${executionResult.content}`,
        type: MessageType.RESULT,
        relatedTask: task,
        metadata: {
          stepId: step.id,
        },
      });

      // 开始评估阶段
      await this.executeEvaluation(task);
    } catch (error) {
      this.logger.error(`Task execution failed: ${error.message}`);
      step.status = StepStatus.FAILED;
      step.errorMessage = error.message;
      await this.stepRepo.save(step);

      await this.handleTaskError(task, error.message);
    }
  }

  /**
   * 执行评估阶段
   */
  private async executeEvaluation(task: CollaborationTask): Promise<void> {
    this.logger.log(`Executing evaluation for task: ${task.id}`);

    // 选择评估Agents
    const evaluatorAgents = await this.selectEvaluatorAgents(task);
    if (evaluatorAgents.length === 0) {
      throw new Error('No evaluator agents available');
    }

    const evaluations: TaskEvaluation[] = [];

    // 为每个评估Agent创建评估任务
    for (const evaluatorAgent of evaluatorAgents) {
      const evaluation = this.evaluationRepo.create({
        task,
        evaluatorAgent: evaluatorAgent.baseAgent,
        status: EvaluationStatus.IN_PROGRESS,
      });

      await this.evaluationRepo.save(evaluation);
      evaluations.push(evaluation);

      // 异步执行评估
      this.performEvaluation(evaluation, evaluatorAgent).catch((error) => {
        this.logger.error(
          `Evaluation failed for agent ${evaluatorAgent.baseAgent.id}: ${error.message}`,
        );
      });
    }

    // 等待所有评估完成
    await this.waitForEvaluations(task, evaluations);
  }

  /**
   * 执行单个评估
   */
  private async performEvaluation(
    evaluation: TaskEvaluation,
    evaluatorAgent: SpecializedAgent,
  ): Promise<void> {
    const evaluationPrompt = this.buildEvaluationPrompt(
      evaluation.task,
      evaluatorAgent,
    );

    try {
      const evaluationResult = await this.callAgent(
        evaluatorAgent.baseAgent,
        evaluationPrompt,
        evaluation.task,
      );

      // 解析评估结果
      const parsedResult = this.parseEvaluationResult(evaluationResult.content);

      evaluation.status = EvaluationStatus.COMPLETED;
      evaluation.result = parsedResult.result;
      evaluation.score = parsedResult.score;
      evaluation.feedback = parsedResult.feedback;
      evaluation.suggestions = parsedResult.suggestions;
      evaluation.isApproved =
        parsedResult.result === EvaluationResult.PASS ||
        parsedResult.result === EvaluationResult.EXCELLENT;
      evaluation.requiresRevision =
        parsedResult.result === EvaluationResult.FAIL ||
        parsedResult.result === EvaluationResult.NEEDS_IMPROVEMENT;
      evaluation.evaluatedAt = new Date();

      await this.evaluationRepo.save(evaluation);

      // 发送评估结果到房间
      await this.sendAgentMessage(
        evaluation.task.room.id,
        evaluatorAgent.baseAgent,
        {
          content: `我的评估结果：\n\n**评分**: ${parsedResult.score}/1.00\n**结果**: ${parsedResult.result}\n**反馈**: ${parsedResult.feedback}`,
          type: MessageType.EVALUATION,
          relatedTask: evaluation.task,
          metadata: {
            evaluationId: evaluation.id,
            score: parsedResult.score,
            result: parsedResult.result,
          },
        },
      );
    } catch (error) {
      evaluation.status = EvaluationStatus.FAILED;
      await this.evaluationRepo.save(evaluation);
      throw error;
    }
  }

  /**
   * 等待所有评估完成并处理结果
   */
  private async waitForEvaluations(
    task: CollaborationTask,
    evaluations: TaskEvaluation[],
  ): Promise<void> {
    // 简化实现：等待一定时间后检查评估状态
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const completedEvaluations = await this.evaluationRepo.find({
      where: { task: { id: task.id } },
      relations: ['evaluatorAgent'],
    });

    const approvedCount = completedEvaluations.filter(
      (e) => e.isApproved,
    ).length;
    const totalCount = completedEvaluations.length;
    const approvalRate = totalCount > 0 ? approvedCount / totalCount : 0;

    const room = await this.roomRepo.findOne({
      where: { id: task.room.id },
      relations: ['settings'],
    });

    const threshold = room?.settings?.evaluationThreshold || 0.7;

    if (approvalRate >= threshold) {
      // 评估通过，任务完成
      task.status = TaskStatus.COMPLETED;
      task.completedAt = new Date();
      await this.taskRepo.save(task);

      await this.sendSystemMessage(task.room.id, {
        content: `任务 "${task.title}" 已完成！评估通过率: ${(approvalRate * 100).toFixed(1)}%`,
        type: MessageType.SYSTEM,
        relatedTask: task,
        metadata: {
          taskCompleted: true,
          approvalRate,
          evaluationCount: totalCount,
        },
      });

      this.eventEmitter.emit('collaboration.task.completed', {
        taskId: task.id,
        roomId: task.room.id,
        approvalRate,
        timestamp: new Date(),
      });
    } else {
      // 评估未通过，需要修订
      task.status = TaskStatus.REVISION;
      task.retryCount += 1;
      await this.taskRepo.save(task);

      if (task.retryCount >= task.maxRetries) {
        // 超过最大重试次数，任务失败
        task.status = TaskStatus.FAILED;
        await this.taskRepo.save(task);

        await this.sendSystemMessage(task.room.id, {
          content: `任务 "${task.title}" 失败：超过最大重试次数`,
          type: MessageType.SYSTEM,
          relatedTask: task,
        });
      } else {
        // 收集反馈并重新执行
        const feedback = this.collectEvaluationFeedback(completedEvaluations);
        await this.handleRevisionRequest(task, feedback);
      }
    }
  }

  /**
   * 处理修订请求
   */
  private async handleRevisionRequest(
    task: CollaborationTask,
    feedback: string,
  ): Promise<void> {
    const mentions = task.workAgent
      ? [
          {
            type: 'agent' as const,
            id: task.workAgent.id,
            name: task.workAgent.name,
          },
        ]
      : [];

    await this.sendSystemMessage(task.room.id, {
      content: `任务需要修订，评估反馈：\n\n${feedback}`,
      type: MessageType.SYSTEM,
      relatedTask: task,
      mentions,
      metadata: {
        isRevisionRequest: true,
        retryCount: task.retryCount,
      },
    });

    // 重新执行任务
    task.status = TaskStatus.EXECUTION;
    await this.taskRepo.save(task);
    await this.executeTask(task);
  }

  // 辅助方法

  private async selectRequirementAnalysisAgent(
    task: CollaborationTask,
  ): Promise<SpecializedAgent | null> {
    return this.specializedAgentRepo.findOne({
      where: {
        role: AgentRole.REQUIREMENT_ANALYST,
        isActive: true,
        isAvailable: true,
      },
      relations: ['baseAgent'],
    });
  }

  private async selectCoordinatorAgent(
    task: CollaborationTask,
  ): Promise<SpecializedAgent | null> {
    return this.specializedAgentRepo.findOne({
      where: {
        role: AgentRole.COORDINATOR,
        isActive: true,
        isAvailable: true,
      },
      relations: ['baseAgent'],
    });
  }

  private async selectWorkAgent(
    task: CollaborationTask,
  ): Promise<SpecializedAgent | null> {
    return this.specializedAgentRepo.findOne({
      where: {
        role: AgentRole.WORK_AGENT,
        isActive: true,
        isAvailable: true,
      },
      relations: ['baseAgent'],
    });
  }

  private async selectEvaluatorAgents(
    task: CollaborationTask,
  ): Promise<SpecializedAgent[]> {
    return this.specializedAgentRepo.find({
      where: {
        role: AgentRole.EVALUATOR,
        isActive: true,
        isAvailable: true,
      },
      relations: ['baseAgent'],
      take: 3, // 最多选择3个评估Agent
    });
  }

  private buildRequirementAnalysisPrompt(
    task: CollaborationTask,
    agent: SpecializedAgent,
  ): string {
    return `作为需求分析专家，请分析以下用户需求并提供详细的需求文档：

原始需求：
${task.originalRequirement}

任务类型：${task.type}
优先级：${task.priority}

请提供：
1. 需求理解和澄清
2. 功能需求列表
3. 非功能需求
4. 验收标准
5. 潜在风险和挑战
6. 建议的实现方案

请以结构化的格式输出分析结果。`;
  }

  private buildPlanningPrompt(
    task: CollaborationTask,
    agent: SpecializedAgent,
  ): string {
    return `作为项目协调专家，请为以下任务制定详细的执行计划：

需求分析结果：
${task.analyzedRequirement}

任务类型：${task.type}

请提供：
1. 任务分解和里程碑
2. 执行步骤和时间安排
3. 所需资源和工具
4. 风险评估和应对策略
5. 质量保证措施
6. 交付物清单

请以可执行的格式输出计划。`;
  }

  private buildExecutionPrompt(
    task: CollaborationTask,
    agent: SpecializedAgent,
  ): string {
    return `作为任务执行专家，请根据以下计划执行任务：

执行计划：
${task.executionPlan}

原始需求：
${task.originalRequirement}

任务类型：${task.type}

请：
1. 按照计划执行任务
2. 使用适当的工具和资源
3. 确保质量和完整性
4. 提供详细的执行结果
5. 记录遇到的问题和解决方案

请提供完整的执行结果和交付物。`;
  }

  private buildEvaluationPrompt(
    task: CollaborationTask,
    agent: SpecializedAgent,
  ): string {
    return `作为质量评估专家，请评估以下任务的执行结果：

原始需求：
${task.originalRequirement}

需求分析：
${task.analyzedRequirement}

执行结果：
${task.result?.output}

请从以下维度进行评估：
1. 完整性 (0-1分)
2. 质量 (0-1分)
3. 准确性 (0-1分)
4. 可用性 (0-1分)
5. 性能 (0-1分)

请提供：
- 总体评分 (0-1分)
- 评估结果 (PASS/FAIL/NEEDS_IMPROVEMENT/EXCELLENT)
- 详细反馈
- 改进建议

请以JSON格式输出评估结果：
{
  "score": 0.85,
  "result": "PASS",
  "feedback": "详细反馈...",
  "suggestions": "改进建议..."
}`;
  }

  private buildRequirementRevisionPrompt(
    task: CollaborationTask,
    feedback: string,
  ): string {
    return `请根据用户反馈修订需求分析：

原始需求：
${task.originalRequirement}

当前分析：
${task.analyzedRequirement}

用户反馈：
${feedback}

请提供修订后的需求分析。`;
  }

  private async callAgent(
    agent: Agent,
    prompt: string,
    task: CollaborationTask,
  ): Promise<{ content: string }> {
    // 这里应该调用Agent服务，简化实现
    const response = await this.llmService.chat({
      model: agent.llmParams?.model || 'gpt-4',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: 'Please proceed with the task.' },
      ],
      temperature: agent.llmParams?.temperature || 0.7,
      maxTokens: agent.llmParams?.maxTokens || 2000,
    });

    return { content: response.content };
  }

  private parseEvaluationResult(content: string): any {
    try {
      // 尝试解析JSON格式的评估结果
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      // 如果解析失败，使用默认值
    }

    return {
      score: 0.7,
      result: EvaluationResult.NEEDS_IMPROVEMENT,
      feedback: content,
      suggestions: '请提供更详细的实现',
    };
  }

  private collectEvaluationFeedback(evaluations: TaskEvaluation[]): string {
    return evaluations
      .filter((e) => e.feedback)
      .map((e) => `${e.evaluatorAgent.name}: ${e.feedback}`)
      .join('\n\n');
  }

  private async sendSystemMessage(
    roomId: string,
    messageData: any,
  ): Promise<void> {
    const message = this.messageRepo.create({
      ...messageData,
      senderType: SenderType.SYSTEM,
      room: { id: roomId },
    });

    await this.messageRepo.save(message);

    this.eventEmitter.emit('collaboration.message.sent', {
      roomId,
      message,
      timestamp: new Date(),
    });
  }

  private async sendAgentMessage(
    roomId: string,
    agent: Agent,
    messageData: any,
  ): Promise<void> {
    const message = this.messageRepo.create({
      ...messageData,
      senderType: SenderType.AGENT,
      agent,
      room: { id: roomId },
    });

    await this.messageRepo.save(message);

    this.eventEmitter.emit('collaboration.message.sent', {
      roomId,
      message,
      timestamp: new Date(),
    });
  }

  private async sendUserMessage(
    roomId: string,
    user: User,
    messageData: any,
  ): Promise<void> {
    const message = this.messageRepo.create({
      ...messageData,
      senderType: SenderType.USER,
      user,
      room: { id: roomId },
    });

    await this.messageRepo.save(message);

    this.eventEmitter.emit('collaboration.message.sent', {
      roomId,
      message,
      timestamp: new Date(),
    });
  }

  private async handleTaskError(
    task: CollaborationTask,
    errorMessage: string,
  ): Promise<void> {
    task.status = TaskStatus.FAILED;
    await this.taskRepo.save(task);

    await this.sendSystemMessage(task.room.id, {
      content: `任务执行失败: ${errorMessage}`,
      type: MessageType.SYSTEM,
      relatedTask: task,
    });

    this.eventEmitter.emit('collaboration.task.failed', {
      taskId: task.id,
      roomId: task.room.id,
      error: errorMessage,
      timestamp: new Date(),
    });
  }
}
