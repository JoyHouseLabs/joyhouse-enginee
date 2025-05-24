import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowExecution, ExecutionStatus } from '../entities/workflow-execution.entity';
import { WorkflowExecutionStep, StepStatus } from '../entities/workflow-execution-step.entity';
import { Workflow, WorkflowNode, WorkflowEdge } from '../entities/workflow.entity';
import { ToolService } from '../../tool/tool.service';
import { AgentService } from '../../agent/agent.service';
import { User } from '../../user/user.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

// 循环状态接口
interface LoopState {
  loopId: string;
  currentIteration: number;
  maxIterations: number;
  startNodeId: string;
  endNodeId: string;
  exitCondition?: string;
  exitEventType?: string;
  exitEventCondition?: any;
  exitKeyword?: string;
}

// 并发状态接口
interface ParallelState {
  parallelId: string;
  strategy: 'wait_all' | 'wait_any' | 'wait_first';
  timeout?: number;
  startTime: Date;
  branches: ParallelBranch[];
  completedBranches: string[];
  failedBranches: string[];
  results: Record<string, any>;
  isCompleted: boolean;
  failureStrategy: 'fail_fast' | 'continue_on_error' | 'ignore_errors';
}

interface ParallelBranch {
  branchId: string;
  branchName: string;
  startNodeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    @InjectRepository(WorkflowExecution)
    private readonly executionRepository: Repository<WorkflowExecution>,
    @InjectRepository(WorkflowExecutionStep)
    private readonly stepRepository: Repository<WorkflowExecutionStep>,
    private readonly toolService: ToolService,
    private readonly agentService: AgentService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async executeWorkflow(
    workflow: Workflow,
    user: User,
    input?: Record<string, any>,
    triggerType?: string,
    triggerData?: any
  ): Promise<WorkflowExecution> {
    this.logger.log(`Starting workflow execution: ${workflow.id}`);

    // Create execution record
    const execution = this.executionRepository.create({
      workflow,
      user,
      status: ExecutionStatus.RUNNING,
      input,
      triggerType,
      triggerData,
      context: { ...workflow.variables, ...input },
      startedAt: new Date(),
    });

    await this.executionRepository.save(execution);

    // Find start node
    const startNode = workflow.nodes.find(node => node.type === 'start');
    if (!startNode) {
      throw new Error('Workflow must have a start node');
    }

    // Start execution from start node
    try {
      await this.executeNode(execution, startNode, workflow);
    } catch (error) {
      this.logger.error(`Workflow execution failed: ${error.message}`, error.stack);
      execution.status = ExecutionStatus.FAILED;
      execution.error = error.message;
      execution.completedAt = new Date();
      await this.executionRepository.save(execution);
    }

    return execution;
  }

  async executeNode(
    execution: WorkflowExecution,
    node: WorkflowNode,
    workflow: Workflow
  ): Promise<void> {
    this.logger.log(`Executing node: ${node.id} (${node.type})`);

    // Update execution current node
    execution.currentNodeId = node.id;
    await this.executionRepository.save(execution);

    // Create step record
    const step = this.stepRepository.create({
      execution,
      nodeId: node.id,
      nodeType: node.type,
      nodeLabel: node.label,
      status: StepStatus.RUNNING,
      startedAt: new Date(),
    });

    await this.stepRepository.save(step);

    try {
      let result: any;

      switch (node.type) {
        case 'start':
          result = await this.executeStartNode(execution, node);
          break;
        case 'end':
          result = await this.executeEndNode(execution, node);
          break;
        case 'tool':
          result = await this.executeToolNode(execution, node);
          break;
        case 'agent':
          result = await this.executeAgentNode(execution, node);
          break;
        case 'condition':
          result = await this.executeConditionNode(execution, node);
          break;
        case 'user_input':
          result = await this.executeUserInputNode(execution, node);
          break;
        case 'wait_event':
          result = await this.executeWaitEventNode(execution, node);
          break;
        case 'approval':
          result = await this.executeApprovalNode(execution, node);
          break;
        case 'script':
          result = await this.executeScriptNode(execution, node);
          break;
        case 'delay':
          result = await this.executeDelayNode(execution, node);
          break;
        case 'loop_start':
          result = await this.executeLoopStartNode(execution, node);
          break;
        case 'loop_end':
          result = await this.executeLoopEndNode(execution, node);
          break;
        case 'loop_condition':
          result = await this.executeLoopConditionNode(execution, node);
          break;
        case 'parallel_start':
          result = await this.executeParallelStartNode(execution, node, workflow);
          break;
        case 'parallel_end':
          result = await this.executeParallelEndNode(execution, node);
          break;
        case 'parallel_branch':
          result = await this.executeParallelBranchNode(execution, node);
          break;
        default:
          throw new Error(`Unsupported node type: ${node.type}`);
      }

      // Update step with result
      step.status = StepStatus.COMPLETED;
      step.output = result;
      step.completedAt = new Date();
      await this.stepRepository.save(step);

      // Update execution context with result
      if (result && typeof result === 'object') {
        execution.context = { ...execution.context, ...result };
        await this.executionRepository.save(execution);
      }

      // Continue to next node if not waiting
      if (execution.status === ExecutionStatus.RUNNING) {
        await this.continueToNextNode(execution, node, workflow, result);
      }

    } catch (error) {
      this.logger.error(`Node execution failed: ${error.message}`, error.stack);
      step.status = StepStatus.FAILED;
      step.error = error.message;
      step.completedAt = new Date();
      await this.stepRepository.save(step);

      execution.status = ExecutionStatus.FAILED;
      execution.error = error.message;
      execution.completedAt = new Date();
      await this.executionRepository.save(execution);
    }
  }

  private async executeStartNode(execution: WorkflowExecution, node: WorkflowNode): Promise<any> {
    return { started: true, timestamp: new Date() };
  }

  private async executeEndNode(execution: WorkflowExecution, node: WorkflowNode): Promise<any> {
    execution.status = ExecutionStatus.COMPLETED;
    execution.completedAt = new Date();
    execution.output = execution.context;
    await this.executionRepository.save(execution);
    
    this.eventEmitter.emit('workflow.completed', { execution });
    return { completed: true, timestamp: new Date() };
  }

  private async executeToolNode(execution: WorkflowExecution, node: WorkflowNode): Promise<any> {
    const { toolId, ...params } = node.data;
    if (!toolId) {
      throw new Error('Tool node must specify toolId');
    }

    // Merge context variables into parameters
    const mergedParams = this.mergeVariables(params, execution.context || {});
    
    const result = await this.toolService.execute(toolId, mergedParams, execution.user);
    return { toolResult: result };
  }

  private async executeAgentNode(execution: WorkflowExecution, node: WorkflowNode): Promise<any> {
    const { agentId, conversationId, message } = node.data;
    if (!agentId) {
      throw new Error('Agent node must specify agentId');
    }

    // Merge context variables into message
    const mergedMessage = this.mergeVariables(message, execution.context || {});
    
    const result = await this.agentService.chat(
      agentId,
      conversationId,
      { message: mergedMessage },
      execution.user
    );
    
    return { agentResponse: result.message };
  }

  private async executeConditionNode(execution: WorkflowExecution, node: WorkflowNode): Promise<any> {
    const { condition } = node.data;
    if (!condition) {
      throw new Error('Condition node must specify condition');
    }

    // Evaluate condition with context
    const result = this.evaluateCondition(condition, execution.context || {});
    return { conditionResult: result };
  }

  private async executeUserInputNode(execution: WorkflowExecution, node: WorkflowNode): Promise<any> {
    execution.status = ExecutionStatus.WAITING_INPUT;
    await this.executionRepository.save(execution);
    
    this.eventEmitter.emit('workflow.waiting_input', { execution, node });
    return { waitingForInput: true };
  }

  private async executeWaitEventNode(execution: WorkflowExecution, node: WorkflowNode): Promise<any> {
    const { eventType, eventCondition } = node.data;
    
    execution.status = ExecutionStatus.WAITING_EVENT;
    await this.executionRepository.save(execution);
    
    this.eventEmitter.emit('workflow.waiting_event', { 
      execution, 
      node, 
      eventType, 
      eventCondition 
    });
    
    return { waitingForEvent: true, eventType, eventCondition };
  }

  private async executeApprovalNode(execution: WorkflowExecution, node: WorkflowNode): Promise<any> {
    const { approvers } = node.data;
    
    execution.status = ExecutionStatus.WAITING_APPROVAL;
    await this.executionRepository.save(execution);
    
    this.eventEmitter.emit('workflow.waiting_approval', { 
      execution, 
      node, 
      approvers 
    });
    
    return { waitingForApproval: true, approvers };
  }

  private async executeScriptNode(execution: WorkflowExecution, node: WorkflowNode): Promise<any> {
    const { script } = node.data;
    if (!script) {
      throw new Error('Script node must specify script');
    }

    // Execute script with context (simplified - in production, use a sandboxed environment)
    try {
      const func = new Function('context', script);
      const result = func(execution.context);
      return { scriptResult: result };
    } catch (error) {
      throw new Error(`Script execution failed: ${error.message}`);
    }
  }

  private async executeDelayNode(execution: WorkflowExecution, node: WorkflowNode): Promise<any> {
    const { delayMs } = node.data;
    if (!delayMs) {
      throw new Error('Delay node must specify delayMs');
    }

    await new Promise(resolve => setTimeout(resolve, delayMs));
    return { delayed: true, delayMs };
  }

  private async executeLoopStartNode(execution: WorkflowExecution, node: WorkflowNode): Promise<any> {
    const { loopId, maxIterations = 100, exitCondition, exitEventType, exitEventCondition, exitKeyword } = node.data;
    
    if (!loopId) {
      throw new Error('Loop start node must specify loopId');
    }

    // 确保context存在
    if (!execution.context) {
      execution.context = {};
    }

    // 初始化或更新循环状态
    if (!execution.context.loops) {
      execution.context.loops = {};
    }

    const existingLoop = execution.context.loops[loopId];
    if (existingLoop) {
      // 循环迭代
      existingLoop.currentIteration++;
      this.logger.log(`Loop ${loopId} iteration ${existingLoop.currentIteration}`);
    } else {
      // 首次进入循环
      execution.context.loops[loopId] = {
        loopId,
        currentIteration: 1,
        maxIterations,
        startNodeId: node.id,
        exitCondition,
        exitEventType,
        exitEventCondition,
        exitKeyword
      } as LoopState;
      this.logger.log(`Starting loop ${loopId}`);
    }

    await this.executionRepository.save(execution);
    return { 
      loopStarted: true, 
      loopId, 
      currentIteration: execution.context.loops[loopId].currentIteration,
      timestamp: new Date() 
    };
  }

  private async executeLoopEndNode(execution: WorkflowExecution, node: WorkflowNode): Promise<any> {
    const { loopId } = node.data;
    
    if (!loopId) {
      throw new Error('Loop end node must specify loopId');
    }

    if (!execution.context?.loops) {
      throw new Error('No loop context found');
    }

    const loopState = execution.context.loops[loopId];
    if (!loopState) {
      throw new Error(`Loop state not found for loopId: ${loopId}`);
    }

    // 检查退出条件
    const shouldExit = await this.checkLoopExitConditions(execution, loopState);
    
    if (shouldExit) {
      // 退出循环
      delete execution.context.loops[loopId];
      this.logger.log(`Exiting loop ${loopId} after ${loopState.currentIteration} iterations`);
      await this.executionRepository.save(execution);
      return { 
        loopExited: true, 
        loopId, 
        totalIterations: loopState.currentIteration,
        exitReason: shouldExit.reason,
        timestamp: new Date() 
      };
    } else {
      // 继续循环 - 跳转回loop_start节点
      const startNode = execution.workflow.nodes.find(n => n.id === loopState.startNodeId);
      if (startNode) {
        this.logger.log(`Continuing loop ${loopId}, jumping to start node`);
        // 直接执行开始节点，不通过continueToNextNode
        await this.executeNode(execution, startNode, execution.workflow);
        return { 
          loopContinued: true, 
          loopId, 
          currentIteration: loopState.currentIteration,
          timestamp: new Date() 
        };
      } else {
        throw new Error(`Loop start node not found: ${loopState.startNodeId}`);
      }
    }
  }

  private async executeLoopConditionNode(execution: WorkflowExecution, node: WorkflowNode): Promise<any> {
    const { loopId, condition } = node.data;
    
    if (!loopId) {
      throw new Error('Loop condition node must specify loopId');
    }

    if (!execution.context?.loops) {
      throw new Error('No loop context found');
    }

    const loopState = execution.context.loops[loopId];
    if (!loopState) {
      throw new Error(`Loop state not found for loopId: ${loopId}`);
    }

    // 评估循环条件
    const conditionResult = condition ? this.evaluateCondition(condition, {
      ...execution.context,
      currentIteration: loopState.currentIteration,
      maxIterations: loopState.maxIterations
    }) : true;

    return { 
      loopConditionResult: conditionResult,
      loopId,
      currentIteration: loopState.currentIteration
    };
  }

  private async checkLoopExitConditions(execution: WorkflowExecution, loopState: LoopState): Promise<{ exit: boolean; reason: string } | null> {
    // 检查最大迭代次数
    if (loopState.currentIteration >= loopState.maxIterations) {
      return { exit: true, reason: 'max_iterations_reached' };
    }

    // 检查退出条件
    if (loopState.exitCondition && execution.context) {
      const exitResult = this.evaluateCondition(loopState.exitCondition, {
        ...execution.context,
        currentIteration: loopState.currentIteration,
        maxIterations: loopState.maxIterations
      });
      if (exitResult) {
        return { exit: true, reason: 'exit_condition_met' };
      }
    }

    // 检查用户输入的退出关键词
    if (loopState.exitKeyword && execution.context?.userInput) {
      const userInput = String(execution.context.userInput).toLowerCase();
      const exitKeyword = String(loopState.exitKeyword).toLowerCase();
      if (userInput.includes(exitKeyword)) {
        return { exit: true, reason: 'exit_keyword_detected' };
      }
    }

    // 检查退出事件
    if (loopState.exitEventType && execution.context?.eventData) {
      if (execution.context.eventData.type === loopState.exitEventType) {
        if (!loopState.exitEventCondition || 
            this.evaluateCondition(loopState.exitEventCondition, execution.context.eventData)) {
          return { exit: true, reason: 'exit_event_triggered' };
        }
      }
    }

    return null;
  }

  private async continueToNextNode(
    execution: WorkflowExecution,
    currentNode: WorkflowNode,
    workflow: Workflow,
    result?: any
  ): Promise<void> {
    // Find outgoing edges from current node
    const outgoingEdges = workflow.edges.filter(edge => edge.source === currentNode.id);
    
    if (outgoingEdges.length === 0) {
      // No outgoing edges, workflow ends here
      execution.status = ExecutionStatus.COMPLETED;
      execution.completedAt = new Date();
      execution.output = execution.context;
      await this.executionRepository.save(execution);
      return;
    }

    // Find the edge to follow
    let edgeToFollow: WorkflowEdge | undefined;

    if (currentNode.type === 'condition') {
      // For condition nodes, find edge based on condition result
      const conditionResult = result?.conditionResult;
      edgeToFollow = outgoingEdges.find(edge => {
        if (!edge.condition) return false;
        return this.evaluateCondition(edge.condition, { ...execution.context, result: conditionResult });
      });
    } else {
      // For other nodes, take the first edge (or implement more complex logic)
      edgeToFollow = outgoingEdges[0];
    }

    if (!edgeToFollow) {
      throw new Error(`No valid edge found from node ${currentNode.id}`);
    }

    // Find target node
    const targetNode = workflow.nodes.find(node => node.id === edgeToFollow.target);
    if (!targetNode) {
      throw new Error(`Target node ${edgeToFollow.target} not found`);
    }

    // Continue execution with target node
    await this.executeNode(execution, targetNode, workflow);
  }

  private mergeVariables(template: any, context: Record<string, any>): any {
    if (typeof template === 'string') {
      // Replace variables in string template
      return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return context[key] || match;
      });
    } else if (typeof template === 'object' && template !== null) {
      // Recursively merge variables in object
      const result: any = {};
      for (const [key, value] of Object.entries(template)) {
        result[key] = this.mergeVariables(value, context);
      }
      return result;
    }
    return template;
  }

  private evaluateCondition(condition: string, context: Record<string, any>): boolean {
    try {
      // Simple condition evaluation (in production, use a proper expression evaluator)
      const func = new Function('context', `with(context) { return ${condition}; }`);
      return Boolean(func(context));
    } catch (error) {
      this.logger.error(`Condition evaluation failed: ${error.message}`);
      return false;
    }
  }

  async continueExecution(executionId: string, input: Record<string, any>): Promise<void> {
    const execution = await this.executionRepository.findOne({
      where: { id: executionId },
      relations: ['workflow', 'user'],
    });

    if (!execution) {
      throw new Error('Execution not found');
    }

    if (execution.status !== ExecutionStatus.WAITING_INPUT) {
      throw new Error('Execution is not waiting for input');
    }

    // Update context with user input
    execution.context = { ...execution.context, ...input };
    execution.status = ExecutionStatus.RUNNING;
    await this.executionRepository.save(execution);

    // Find current node and continue
    const currentNode = execution.workflow.nodes.find(node => node.id === execution.currentNodeId);
    if (currentNode) {
      await this.continueToNextNode(execution, currentNode, execution.workflow, input);
    }
  }

  async handleApproval(executionId: string, approved: boolean, comment?: string): Promise<void> {
    const execution = await this.executionRepository.findOne({
      where: { id: executionId },
      relations: ['workflow', 'user'],
    });

    if (!execution) {
      throw new Error('Execution not found');
    }

    if (execution.status !== ExecutionStatus.WAITING_APPROVAL) {
      throw new Error('Execution is not waiting for approval');
    }

    // Update context with approval result
    execution.context = { 
      ...execution.context, 
      approved, 
      approvalComment: comment,
      approvalTimestamp: new Date()
    };
    execution.status = ExecutionStatus.RUNNING;
    await this.executionRepository.save(execution);

    // Find current node and continue
    const currentNode = execution.workflow.nodes.find(node => node.id === execution.currentNodeId);
    if (currentNode) {
      await this.continueToNextNode(execution, currentNode, execution.workflow, { approved });
    }
  }

  async handleEvent(eventType: string, eventData: any): Promise<void> {
    // Find executions waiting for this event type
    const waitingExecutions = await this.executionRepository.find({
      where: { status: ExecutionStatus.WAITING_EVENT },
      relations: ['workflow', 'user'],
    });

    for (const execution of waitingExecutions) {
      const currentNode = execution.workflow.nodes.find(node => node.id === execution.currentNodeId);
      if (currentNode && currentNode.data.eventType === eventType) {
        // Check if event condition is met
        const eventCondition = currentNode.data.eventCondition;
        if (!eventCondition || this.evaluateCondition(eventCondition, eventData)) {
          // Update context with event data
          execution.context = { ...execution.context, eventData };
          execution.status = ExecutionStatus.RUNNING;
          await this.executionRepository.save(execution);

          // Continue execution
          await this.continueToNextNode(execution, currentNode, execution.workflow, eventData);
        }
      }
    }
  }

  // 并发执行相关方法
  private async executeParallelStartNode(
    execution: WorkflowExecution,
    node: WorkflowNode,
    workflow: Workflow
  ): Promise<any> {
    const { parallelId, parallelStrategy = 'wait_all', parallelTimeout, failureStrategy = 'fail_fast' } = node.data;
    
    if (!parallelId) {
      throw new Error('Parallel start node must specify parallelId');
    }

    // 确保context存在
    if (!execution.context) {
      execution.context = {};
    }

    // 初始化并发状态
    if (!execution.context.parallels) {
      execution.context.parallels = {};
    }

    // 查找所有并行分支
    const parallelBranches = this.findParallelBranches(workflow, parallelId);
    
    if (parallelBranches.length === 0) {
      throw new Error(`No parallel branches found for parallelId: ${parallelId}`);
    }

    // 创建并发状态
    const parallelState: ParallelState = {
      parallelId,
      strategy: parallelStrategy,
      timeout: parallelTimeout,
      startTime: new Date(),
      branches: parallelBranches.map(branch => ({
        branchId: branch.id,
        branchName: branch.data.branchName || branch.label,
        startNodeId: branch.id,
        status: 'pending'
      })),
      completedBranches: [],
      failedBranches: [],
      results: {},
      isCompleted: false,
      failureStrategy
    };

    execution.context.parallels[parallelId] = parallelState;
    await this.executionRepository.save(execution);

    // 启动所有并行分支
    this.logger.log(`Starting parallel execution for ${parallelBranches.length} branches`);
    
    for (const branch of parallelBranches) {
      this.executeBranchAsync(execution, branch, workflow, parallelId);
    }

    return {
      parallelStarted: true,
      parallelId,
      branchCount: parallelBranches.length,
      strategy: parallelStrategy,
      timestamp: new Date()
    };
  }

  private async executeParallelEndNode(execution: WorkflowExecution, node: WorkflowNode): Promise<any> {
    const { parallelId, aggregationScript } = node.data;
    
    if (!parallelId) {
      throw new Error('Parallel end node must specify parallelId');
    }

    if (!execution.context?.parallels) {
      throw new Error('No parallel context found');
    }

    const parallelState = execution.context.parallels[parallelId];
    if (!parallelState) {
      throw new Error(`Parallel state not found for parallelId: ${parallelId}`);
    }

    // 检查是否所有分支都已完成
    const shouldComplete = this.shouldCompleteParallel(parallelState);
    
    if (!shouldComplete.complete) {
      // 还有分支未完成，等待
      execution.status = ExecutionStatus.WAITING_EVENT;
      await this.executionRepository.save(execution);
      
      this.logger.log(`Waiting for parallel branches to complete: ${shouldComplete.reason}`);
      return {
        parallelWaiting: true,
        parallelId,
        reason: shouldComplete.reason,
        completedBranches: parallelState.completedBranches.length,
        totalBranches: parallelState.branches.length
      };
    }

    // 所有分支已完成，汇总结果
    let aggregatedResult = parallelState.results;
    
    if (aggregationScript) {
      try {
        const func = new Function('results', 'context', aggregationScript);
        aggregatedResult = func(parallelState.results, execution.context);
      } catch (error) {
        this.logger.error(`Aggregation script failed: ${error.message}`);
        throw new Error(`Aggregation script execution failed: ${error.message}`);
      }
    }

    // 清理并发状态
    delete execution.context.parallels[parallelId];
    
    // 更新执行上下文
    execution.context = { ...execution.context, ...aggregatedResult };
    execution.status = ExecutionStatus.RUNNING;
    await this.executionRepository.save(execution);

    this.logger.log(`Parallel execution completed for ${parallelId}`);
    
    return {
      parallelCompleted: true,
      parallelId,
      results: aggregatedResult,
      completedBranches: parallelState.completedBranches.length,
      failedBranches: parallelState.failedBranches.length,
      totalTime: Date.now() - parallelState.startTime.getTime(),
      timestamp: new Date()
    };
  }

  private async executeParallelBranchNode(execution: WorkflowExecution, node: WorkflowNode): Promise<any> {
    const { parallelId, branchName } = node.data;
    
    if (!parallelId) {
      throw new Error('Parallel branch node must specify parallelId');
    }

    return {
      parallelBranch: true,
      parallelId,
      branchName: branchName || node.label,
      branchId: node.id,
      timestamp: new Date()
    };
  }

  private findParallelBranches(workflow: Workflow, parallelId: string): WorkflowNode[] {
    return workflow.nodes.filter(node => 
      node.type === 'parallel_branch' && node.data.parallelId === parallelId
    );
  }

  private async executeBranchAsync(
    execution: WorkflowExecution,
    branchNode: WorkflowNode,
    workflow: Workflow,
    parallelId: string
  ): Promise<void> {
    try {
      // 创建分支执行上下文
      const branchContext = { ...execution.context };
      
      // 更新分支状态
      const parallelState = execution.context?.parallels?.[parallelId];
      const branch = parallelState?.branches.find(b => b.branchId === branchNode.id);
      if (branch) {
        branch.status = 'running';
        branch.startTime = new Date();
      }

      this.logger.log(`Starting parallel branch: ${branchNode.id}`);

      // 执行分支节点
      const branchResult = await this.executeBranchNode(branchNode, branchContext, workflow);
      
      // 更新分支完成状态
      if (branch) {
        branch.status = 'completed';
        branch.result = branchResult;
        branch.endTime = new Date();
      }

      if (parallelState) {
        parallelState.completedBranches.push(branchNode.id);
        parallelState.results[branchNode.data.branchName || branchNode.label] = branchResult;
      }

      this.logger.log(`Parallel branch completed: ${branchNode.id}`);

      // 检查是否需要继续执行
      await this.checkParallelCompletion(execution, parallelId);

    } catch (error) {
      this.logger.error(`Parallel branch failed: ${branchNode.id} - ${error.message}`);
      
      const parallelState = execution.context?.parallels?.[parallelId];
      const branch = parallelState?.branches.find(b => b.branchId === branchNode.id);
      if (branch) {
        branch.status = 'failed';
        branch.error = error.message;
        branch.endTime = new Date();
      }

      if (parallelState) {
        parallelState.failedBranches.push(branchNode.id);
      }

      // 根据失败策略处理
      if (parallelState.failureStrategy === 'fail_fast') {
        execution.status = ExecutionStatus.FAILED;
        execution.error = `Parallel branch failed: ${error.message}`;
        execution.completedAt = new Date();
        await this.executionRepository.save(execution);
        return;
      }

      await this.checkParallelCompletion(execution, parallelId);
    }
  }

  private async executeBranchNode(
    node: WorkflowNode,
    context: Record<string, any>,
    workflow: Workflow
  ): Promise<any> {
    // 根据节点类型执行相应逻辑
    switch (node.type) {
      case 'tool':
        return await this.executeBranchToolNode(node, context);
      case 'agent':
        return await this.executeBranchAgentNode(node, context);
      case 'script':
        return await this.executeBranchScriptNode(node, context);
      default:
        throw new Error(`Unsupported parallel branch node type: ${node.type}`);
    }
  }

  private async executeBranchToolNode(node: WorkflowNode, context: Record<string, any>): Promise<any> {
    const { toolId, ...params } = node.data;
    if (!toolId) {
      throw new Error('Tool node must specify toolId');
    }

    const mergedParams = this.mergeVariables(params, context);
    // 注意：这里需要传入用户信息，但在并发执行中可能需要从执行上下文获取
    // 简化处理，实际使用时需要完善用户信息传递
    const result = await this.toolService.execute(toolId, mergedParams, null as any);
    return { toolResult: result };
  }

  private async executeBranchAgentNode(node: WorkflowNode, context: Record<string, any>): Promise<any> {
    const { agentId, conversationId, message } = node.data;
    if (!agentId) {
      throw new Error('Agent node must specify agentId');
    }

    const mergedMessage = this.mergeVariables(message, context);
    // 注意：这里需要传入用户信息，实际使用时需要完善
    const result = await this.agentService.chat(
      agentId,
      conversationId,
      { message: mergedMessage },
      null as any
    );
    
    return { agentResponse: result.message };
  }

  private async executeBranchScriptNode(node: WorkflowNode, context: Record<string, any>): Promise<any> {
    const { script } = node.data;
    if (!script) {
      throw new Error('Script node must specify script');
    }

    try {
      const func = new Function('context', script);
      const result = func(context);
      return { scriptResult: result };
    } catch (error) {
      throw new Error(`Script execution failed: ${error.message}`);
    }
  }

  private shouldCompleteParallel(parallelState: ParallelState): { complete: boolean; reason: string } {
    const totalBranches = parallelState.branches.length;
    const completedCount = parallelState.completedBranches.length;
    const failedCount = parallelState.failedBranches.length;
    const runningCount = totalBranches - completedCount - failedCount;

    // 检查超时
    if (parallelState.timeout) {
      const elapsed = Date.now() - parallelState.startTime.getTime();
      if (elapsed > parallelState.timeout) {
        return { complete: true, reason: 'timeout' };
      }
    }

    switch (parallelState.strategy) {
      case 'wait_all':
        if (completedCount === totalBranches) {
          return { complete: true, reason: 'all_completed' };
        }
        if (parallelState.failureStrategy === 'fail_fast' && failedCount > 0) {
          return { complete: true, reason: 'fail_fast' };
        }
        if (completedCount + failedCount === totalBranches) {
          return { complete: true, reason: 'all_finished' };
        }
        return { complete: false, reason: `waiting for ${runningCount} branches` };

      case 'wait_any':
        if (completedCount > 0) {
          return { complete: true, reason: 'any_completed' };
        }
        if (failedCount === totalBranches) {
          return { complete: true, reason: 'all_failed' };
        }
        return { complete: false, reason: 'waiting for any completion' };

      case 'wait_first':
        if (completedCount > 0 || failedCount > 0) {
          return { complete: true, reason: 'first_finished' };
        }
        return { complete: false, reason: 'waiting for first completion' };

      default:
        return { complete: true, reason: 'unknown_strategy' };
    }
  }

  private async checkParallelCompletion(execution: WorkflowExecution, parallelId: string): Promise<void> {
    const parallelState = execution.context.parallels[parallelId];
    if (!parallelState) return;

    const shouldComplete = this.shouldCompleteParallel(parallelState);
    
    if (shouldComplete.complete) {
      parallelState.isCompleted = true;
      
      // 如果执行状态是等待事件，改为运行状态以便继续
      if (execution.status === ExecutionStatus.WAITING_EVENT) {
        execution.status = ExecutionStatus.RUNNING;
        await this.executionRepository.save(execution);
        
        // 查找parallel_end节点并继续执行
        const parallelEndNode = execution.workflow.nodes.find(node => 
          node.type === 'parallel_end' && node.data.parallelId === parallelId
        );
        
        if (parallelEndNode) {
          await this.executeNode(execution, parallelEndNode, execution.workflow);
        }
      }
    }
  }
} 