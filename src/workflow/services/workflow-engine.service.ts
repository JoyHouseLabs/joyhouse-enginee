import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  WorkflowExecution,
  ExecutionStatus,
} from '../entities/workflow-execution.entity';
import {
  WorkflowExecutionStep,
  StepStatus,
} from '../entities/workflow-execution-step.entity';
import {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
} from '../entities/workflow.entity';
import { ToolService } from '../../tool/tool.service';
import { AgentService } from '../../agent/agent.service';
import { McpService } from '../../mcp/services/mcp.service';
import { LlmService } from '../../llm/llm.service';
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
    @Inject(forwardRef(() => AgentService))
    private readonly agentService: AgentService,
    private readonly mcpService: McpService,
    private readonly llmService: LlmService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async executeWorkflow(
    workflow: Workflow,
    user: User,
    input?: Record<string, any>,
    triggerType?: string,
    triggerData?: any,
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

    // 发射工作流开始事件
    this.eventEmitter.emit('workflow.started', { execution });

    // Find start node
    const startNode = workflow.nodes.find((node) => node.type === 'start');
    if (!startNode) {
      throw new Error('Workflow must have a start node');
    }

    // Start execution from start node
    try {
      await this.executeNode(execution, startNode, workflow);
    } catch (error) {
      this.logger.error(
        `Workflow execution failed: ${error.message}`,
        error.stack,
      );
      execution.status = ExecutionStatus.FAILED;
      execution.error = error.message;
      execution.completedAt = new Date();
      await this.executionRepository.save(execution);

      // 发射工作流失败事件
      this.eventEmitter.emit('workflow.failed', {
        execution,
        error: error.message,
      });
    }

    return execution;
  }

  async executeNode(
    execution: WorkflowExecution,
    node: WorkflowNode,
    workflow: Workflow,
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

    // 发射节点开始执行事件
    this.eventEmitter.emit('node.execution.started', {
      execution,
      node,
      input: execution.context,
    });

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
          result = await this.executeParallelStartNode(
            execution,
            node,
            workflow,
          );
          break;
        case 'parallel_end':
          result = await this.executeParallelEndNode(execution, node);
          break;
        case 'parallel_branch':
          result = await this.executeParallelBranchNode(execution, node);
          break;
        case 'mcp_tool':
          result = await this.executeMcpToolNode(execution, node);
          break;
        case 'llm':
          result = await this.executeLlmNode(execution, node);
          break;
        case 'intent_recognition':
          result = await this.executeIntentRecognitionNode(execution, node);
          break;
        default:
          throw new Error(`Unsupported node type: ${node.type}`);
      }

      // Update step with result
      step.status = StepStatus.COMPLETED;
      step.output = result;
      step.completedAt = new Date();
      await this.stepRepository.save(step);

      // 计算执行时间
      const duration =
        step.completedAt && step.startedAt
          ? step.completedAt.getTime() - step.startedAt.getTime()
          : 0;

      // 发射节点完成执行事件
      this.eventEmitter.emit('node.execution.completed', {
        execution,
        node,
        output: result,
        duration,
      });

      // Enhanced data storage: Store node outputs separately
      if (!execution.context) {
        execution.context = {};
      }

      // Initialize node outputs storage if not exists
      if (!execution.context.nodeOutputs) {
        execution.context.nodeOutputs = {};
      }

      // Store this node's output with node ID as key
      if (result && typeof result === 'object') {
        execution.context.nodeOutputs[node.id] = {
          ...result,
          nodeId: node.id,
          nodeType: node.type,
          nodeLabel: node.label,
          timestamp: new Date(),
        };

        // Also merge into global context for backward compatibility
        execution.context = { ...execution.context, ...result };
      }

      await this.executionRepository.save(execution);

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

      // 计算执行时间（即使失败）
      const duration =
        step.completedAt && step.startedAt
          ? step.completedAt.getTime() - step.startedAt.getTime()
          : 0;

      // 发射节点执行失败事件
      this.eventEmitter.emit('node.execution.failed', {
        execution,
        node,
        error: error.message,
        duration,
      });

      execution.status = ExecutionStatus.FAILED;
      execution.error = error.message;
      execution.completedAt = new Date();
      await this.executionRepository.save(execution);

      // 发射工作流失败事件
      this.eventEmitter.emit('workflow.failed', {
        execution,
        error: error.message,
      });
    }
  }

  private async executeStartNode(
    execution: WorkflowExecution,
    node: WorkflowNode,
  ): Promise<any> {
    return { started: true, timestamp: new Date() };
  }

  private async executeEndNode(
    execution: WorkflowExecution,
    node: WorkflowNode,
  ): Promise<any> {
    execution.status = ExecutionStatus.COMPLETED;
    execution.completedAt = new Date();
    execution.output = execution.context;
    await this.executionRepository.save(execution);

    this.eventEmitter.emit('workflow.completed', { execution });
    return { completed: true, timestamp: new Date() };
  }

  private async executeToolNode(
    execution: WorkflowExecution,
    node: WorkflowNode,
  ): Promise<any> {
    const { toolId, ...params } = node.data;
    if (!toolId) {
      throw new Error('Tool node must specify toolId');
    }

    // Merge context variables into parameters
    const mergedParams = this.mergeVariables(params, execution.context || {});

    const result = await this.toolService.execute(
      toolId,
      mergedParams,
      execution.user,
    );
    return { toolResult: result };
  }

  private async executeAgentNode(
    execution: WorkflowExecution,
    node: WorkflowNode,
  ): Promise<any> {
    const { agentId, conversationId, message } = node.data;
    if (!agentId) {
      throw new Error('Agent node must specify agentId');
    }

    const mergedMessage = this.mergeVariables(message, execution.context || {});
    // Use a default conversation ID if not provided
    const finalConversationId = conversationId || `branch-${node.id}`;

    // 注意：这里需要传入用户信息，实际使用时需要完善
    const result = await this.agentService.chat(
      agentId,
      finalConversationId,
      { message: mergedMessage },
      null as any,
    );

    return { agentResponse: result.message };
  }

  private async executeMcpToolNode(
    execution: WorkflowExecution,
    node: WorkflowNode,
  ): Promise<any> {
    const {
      mcpServerId,
      mcpServerName,
      mcpToolName,
      mcpToolId,
      mcpArguments = {},
      mcpTimeout = 30000,
      mcpRetryAttempts = 3,
      mcpRetryDelay = 1000,
    } = node.data;

    if (!mcpToolName) {
      throw new Error('MCP tool node must specify mcpToolName');
    }

    if (!mcpServerId && !mcpServerName) {
      throw new Error(
        'MCP tool node must specify either mcpServerId or mcpServerName',
      );
    }

    // Merge context variables into arguments
    const mergedArguments = this.mergeVariables(
      mcpArguments,
      execution.context || {},
    );

    let result: any;
    let lastError: Error | null = null;

    // Retry logic
    for (let attempt = 1; attempt <= mcpRetryAttempts; attempt++) {
      try {
        this.logger.log(
          `Executing MCP tool ${mcpToolName} (attempt ${attempt}/${mcpRetryAttempts})`,
        );

        if (mcpServerId) {
          // Execute by server ID
          result = await Promise.race([
            this.mcpService.executeTool(
              mcpServerId,
              {
                toolName: mcpToolName,
                arguments: mergedArguments,
              },
              execution.user,
            ),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error('MCP tool execution timeout')),
                mcpTimeout,
              ),
            ),
          ]);
        } else if (mcpServerName) {
          // Execute by server name and tool name
          result = await Promise.race([
            this.mcpService.executeToolByName(
              mcpServerName,
              mcpToolName,
              mergedArguments,
              execution.user,
            ),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error('MCP tool execution timeout')),
                mcpTimeout,
              ),
            ),
          ]);
        }

        // Success - break out of retry loop
        break;
      } catch (error: any) {
        lastError = error;
        this.logger.warn(
          `MCP tool execution attempt ${attempt} failed: ${error.message}`,
        );

        // If this is the last attempt, throw the error
        if (attempt === mcpRetryAttempts) {
          throw new Error(
            `MCP tool execution failed after ${mcpRetryAttempts} attempts: ${error.message}`,
          );
        }

        // Wait before retrying
        if (mcpRetryDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, mcpRetryDelay));
        }
      }
    }

    this.logger.log(`MCP tool ${mcpToolName} executed successfully`);

    return {
      mcpToolResult: result,
      mcpToolName,
      mcpServerName: mcpServerName || 'unknown',
      executionTime: new Date(),
    };
  }

  private async executeLlmNode(
    execution: WorkflowExecution,
    node: WorkflowNode,
  ): Promise<any> {
    const {
      modelName,
      modelId,
      prompt,
      systemPrompt,
      messages = [],
      temperature = 0.7,
      maxTokens = 1000,
      topP = 1.0,
      frequencyPenalty = 0,
      presencePenalty = 0,
      stream = false,
      enableConversation = false,
      conversationId,
      conversationMaxHistory = 10,
      timeout = 30000,
      retryAttempts = 3,
      retryDelay = 1000,
      outputFormat = 'text', // 'text' | 'json' | 'markdown'
      extractFields = [], // 从输出中提取的字段
      transformScript, // 对输出进行转换的脚本
    } = node.data;

    if (!modelName && !modelId) {
      throw new Error('LLM node must specify either modelName or modelId');
    }

    if (!prompt && messages.length === 0) {
      throw new Error('LLM node must specify either prompt or messages');
    }

    // 合并上下文变量到提示词和消息中
    const mergedPrompt = prompt
      ? this.mergeVariables(prompt, execution.context || {})
      : '';
    const mergedSystemPrompt = systemPrompt
      ? this.mergeVariables(systemPrompt, execution.context || {})
      : '';
    const mergedMessages = messages.map((msg: any) => ({
      ...msg,
      content: this.mergeVariables(msg.content, execution.context || {}),
    }));

    // 构建对话历史
    let conversationHistory: any[] = [];

    if (enableConversation && conversationId) {
      // 确保执行上下文存在
      if (!execution.context) {
        execution.context = {};
      }

      // 从执行上下文中获取对话历史
      if (!execution.context.conversations) {
        execution.context.conversations = {};
      }

      conversationHistory =
        execution.context.conversations[conversationId] || [];

      // 限制历史记录长度
      if (conversationHistory.length > conversationMaxHistory * 2) {
        conversationHistory = conversationHistory.slice(
          -conversationMaxHistory * 2,
        );
      }
    }

    // 构建最终的消息列表
    const finalMessages: any[] = [];

    if (mergedSystemPrompt) {
      finalMessages.push({ role: 'system', content: mergedSystemPrompt });
    }

    // 添加对话历史
    finalMessages.push(...conversationHistory);

    // 添加预定义消息
    finalMessages.push(...mergedMessages);

    // 如果有prompt，作为用户消息添加
    if (mergedPrompt) {
      finalMessages.push({ role: 'user', content: mergedPrompt });
    }

    let result: any;
    let lastError: Error | null = null;

    // 重试逻辑
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        this.logger.log(
          `Executing LLM node with model ${modelName || modelId} (attempt ${attempt}/${retryAttempts})`,
        );

        // 构建请求参数
        const modelToUse = modelName || modelId;
        if (!modelToUse) {
          throw new Error('Model name or ID is required');
        }

        const chatRequest = {
          model: modelToUse,
          messages: finalMessages,
          temperature,
          max_tokens: maxTokens,
          top_p: topP,
          frequency_penalty: frequencyPenalty,
          presence_penalty: presencePenalty,
          stream,
        };

        // 执行LLM调用（带超时）
        result = await Promise.race([
          this.llmService.chat(chatRequest),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('LLM execution timeout')),
              timeout,
            ),
          ),
        ]);

        // 成功 - 跳出重试循环
        break;
      } catch (error: any) {
        lastError = error;
        this.logger.warn(
          `LLM execution attempt ${attempt} failed: ${error.message}`,
        );

        // 如果是最后一次尝试，抛出错误
        if (attempt === retryAttempts) {
          throw new Error(
            `LLM execution failed after ${retryAttempts} attempts: ${error.message}`,
          );
        }

        // 重试前等待
        if (retryDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }

    // 处理输出
    let processedOutput = result.content;

    // 根据输出格式处理
    if (outputFormat === 'json') {
      try {
        processedOutput = JSON.parse(result.content);
      } catch (error) {
        this.logger.warn(
          `Failed to parse LLM output as JSON: ${error.message}`,
        );
        // 尝试提取JSON部分
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            processedOutput = JSON.parse(jsonMatch[0]);
          } catch (e) {
            this.logger.warn(`Failed to extract JSON from LLM output`);
          }
        }
      }
    }

    // 提取指定字段
    const extractedFields: Record<string, any> = {};
    if (extractFields.length > 0 && typeof processedOutput === 'object') {
      for (const field of extractFields) {
        if (processedOutput[field] !== undefined) {
          extractedFields[field] = processedOutput[field];
        }
      }
    }

    // 执行转换脚本
    if (transformScript) {
      try {
        const func = new Function(
          'output',
          'context',
          'extractedFields',
          transformScript,
        );
        processedOutput = func(
          processedOutput,
          execution.context,
          extractedFields,
        );
      } catch (error) {
        this.logger.error(
          `Transform script execution failed: ${error.message}`,
        );
        throw new Error(`Transform script execution failed: ${error.message}`);
      }
    }

    // 更新对话历史
    if (enableConversation && conversationId) {
      // 确保执行上下文存在
      if (!execution.context) {
        execution.context = {};
      }

      if (!execution.context.conversations) {
        execution.context.conversations = {};
      }

      if (mergedPrompt) {
        conversationHistory.push({ role: 'user', content: mergedPrompt });
      }
      conversationHistory.push({ role: 'assistant', content: result.content });

      execution.context.conversations[conversationId] = conversationHistory;
    }

    this.logger.log(
      `LLM node executed successfully with model ${modelName || modelId}`,
    );

    return {
      llmResponse: processedOutput,
      rawResponse: result.content,
      modelName: modelName || modelId,
      usage: result.usage,
      extractedFields,
      conversationId: enableConversation ? conversationId : undefined,
      executionTime: new Date(),
      outputFormat,
    };
  }

  private async executeIntentRecognitionNode(
    execution: WorkflowExecution,
    node: WorkflowNode,
  ): Promise<any> {
    const {
      intentModelName = 'gpt-3.5-turbo',
      intentModelId,
      intentSystemPrompt,
      intentCategories = [],
      intentConfidenceThreshold = 0.7,
      intentFallbackAction = 'ask_clarification',
      intentParameterExtraction = true,
      intentParameterSchema = {},
      intentContextWindow = 5,
      intentEnableHistory = true,
      intentHistoryMaxLength = 10,
      intentCustomPrompt,
      intentOutputFormat = 'structured',
      intentEnableMultiIntent = false,
      intentValidationRules = [],
      timeout = 30000,
      retryAttempts = 3,
      retryDelay = 1000,
    } = node.data;

    const userInput = this.mergeVariables(
      '{{userInput}}',
      execution.context || {},
    );

    if (!userInput) {
      throw new Error('Intent recognition node requires userInput in context');
    }

    if (intentCategories.length === 0) {
      throw new Error(
        'Intent recognition node must have at least one intent category',
      );
    }

    // 构建意图识别提示词
    const intentPrompt = this.buildIntentRecognitionPrompt(
      userInput,
      intentCategories,
      intentSystemPrompt,
      intentCustomPrompt,
      intentOutputFormat,
      intentEnableMultiIntent,
      execution.context,
    );

    // 构建对话历史（如果启用）
    let conversationHistory: any[] = [];
    if (intentEnableHistory) {
      if (!execution.context) {
        execution.context = {};
      }

      if (!execution.context.intentHistory) {
        execution.context.intentHistory = [];
      }

      conversationHistory =
        execution.context.intentHistory.slice(-intentContextWindow);
    }

    // 构建LLM请求消息
    const messages = [
      {
        role: 'system',
        content: intentSystemPrompt || this.getDefaultIntentSystemPrompt(),
      },
      ...conversationHistory,
      {
        role: 'user',
        content: intentPrompt,
      },
    ];

    let result: any;
    let lastError: Error | null = null;

    // 重试逻辑
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        this.logger.log(
          `Executing intent recognition (attempt ${attempt}/${retryAttempts})`,
        );

        const modelToUse = intentModelName || intentModelId;
        if (!modelToUse) {
          throw new Error('Intent model name or ID is required');
        }

        const chatRequest = {
          model: modelToUse,
          messages,
          temperature: 0.1, // 低温度确保一致性
          max_tokens: 1000,
          top_p: 1.0,
          frequency_penalty: 0,
          presence_penalty: 0,
          stream: false,
        };

        // 执行LLM调用（带超时）
        result = await Promise.race([
          this.llmService.chat(chatRequest),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Intent recognition timeout')),
              timeout,
            ),
          ),
        ]);

        // 成功 - 跳出重试循环
        break;
      } catch (error: any) {
        lastError = error;
        this.logger.warn(
          `Intent recognition attempt ${attempt} failed: ${error.message}`,
        );

        if (attempt === retryAttempts) {
          throw new Error(
            `Intent recognition failed after ${retryAttempts} attempts: ${error.message}`,
          );
        }

        if (retryDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }

    // 解析意图识别结果
    const intentResult = this.parseIntentResult(
      result.content,
      intentOutputFormat,
    );

    // 验证意图置信度
    const validatedIntents = this.validateIntentConfidence(
      intentResult,
      intentConfidenceThreshold,
    );

    // 处理参数提取
    let extractedParameters: Record<string, any> = {};
    let parameterExtractionNeeded = false;

    if (intentParameterExtraction && validatedIntents.length > 0) {
      const primaryIntent = validatedIntents[0];
      const intentCategory = intentCategories.find(
        (cat) =>
          cat.id === primaryIntent.intentId ||
          cat.name === primaryIntent.intentName,
      );

      if (
        intentCategory &&
        intentCategory.requiredParameters &&
        intentCategory.requiredParameters.length > 0
      ) {
        const parameterResult = await this.extractIntentParameters(
          userInput,
          intentCategory,
          execution.context || {},
          intentModelName || intentModelId || 'gpt-3.5-turbo',
        );

        extractedParameters = parameterResult.parameters;
        parameterExtractionNeeded = parameterResult.needsMoreInfo;
      }
    }

    // 更新意图历史
    if (intentEnableHistory) {
      if (!execution.context) {
        execution.context = {};
      }

      if (!execution.context.intentHistory) {
        execution.context.intentHistory = [];
      }

      execution.context.intentHistory.push(
        { role: 'user', content: userInput },
        { role: 'assistant', content: JSON.stringify(intentResult) },
      );

      // 限制历史长度
      if (execution.context.intentHistory.length > intentHistoryMaxLength * 2) {
        execution.context.intentHistory = execution.context.intentHistory.slice(
          -intentHistoryMaxLength * 2,
        );
      }
    }

    // 处理回退策略
    let fallbackAction = null;
    if (validatedIntents.length === 0) {
      fallbackAction = await this.handleIntentFallback(
        intentFallbackAction,
        userInput,
        execution.context || {},
        intentModelName || intentModelId || 'gpt-3.5-turbo',
      );
    }

    this.logger.log(
      `Intent recognition completed. Found ${validatedIntents.length} valid intents`,
    );

    return {
      recognizedIntents: validatedIntents,
      primaryIntent: validatedIntents[0] || null,
      allIntents: intentResult.intents || [intentResult],
      confidence: validatedIntents[0]?.confidence || 0,
      userInput,
      extractedParameters,
      parameterExtractionNeeded,
      fallbackAction,
      needsClarification:
        validatedIntents.length === 0 || parameterExtractionNeeded,
      suggestedActions: this.generateSuggestedActions(
        validatedIntents,
        intentCategories,
      ),
      executionTime: new Date(),
      modelUsed: intentModelName || intentModelId,
      rawLlmResponse: result.content,
    };
  }

  private buildIntentRecognitionPrompt(
    userInput: string,
    intentCategories: any[],
    systemPrompt?: string,
    customPrompt?: string,
    outputFormat: string = 'structured',
    enableMultiIntent: boolean = false,
    context: Record<string, any> = {},
  ): string {
    if (customPrompt) {
      return this.mergeVariables(customPrompt, { ...context, userInput });
    }

    const categoriesDescription = intentCategories
      .map(
        (cat) =>
          `- ${cat.name} (${cat.id}): ${cat.description}${cat.keywords ? ` 关键词: ${cat.keywords.join(', ')}` : ''}${cat.examples ? ` 示例: ${cat.examples.join('; ')}` : ''}`,
      )
      .join('\n');

    const multiIntentNote = enableMultiIntent
      ? '\n注意：用户可能表达多个意图，请识别所有相关意图。'
      : '\n注意：请识别最主要的单一意图。';

    const outputFormatInstruction =
      outputFormat === 'structured'
        ? `
请以以下JSON格式返回结果：
{
  "intents": [
    {
      "intentId": "意图ID",
      "intentName": "意图名称", 
      "confidence": 0.95,
      "reasoning": "识别理由",
      "extractedEntities": {
        "entity1": "value1",
        "entity2": "value2"
      }
    }
  ],
  "primaryIntent": "主要意图ID",
  "needsMoreInfo": false,
  "clarificationQuestion": "如果需要澄清的问题"
}`
        : `
请简单返回识别到的意图名称和置信度。`;

    return `用户输入：${userInput}

可用的意图类别：
${categoriesDescription}${multiIntentNote}

${outputFormatInstruction}`;
  }

  private getDefaultIntentSystemPrompt(): string {
    return `你是一个专业的意图识别助手。你的任务是准确识别用户输入的意图，并提取相关的实体信息。

请遵循以下原则：
1. 仔细分析用户输入的语义和上下文
2. 基于提供的意图类别进行匹配
3. 给出合理的置信度评分（0-1之间）
4. 如果不确定，请诚实地表达不确定性
5. 提取用户输入中的关键实体信息
6. 如果需要更多信息才能确定意图，请说明

请始终返回结构化的JSON格式结果。`;
  }

  private parseIntentResult(llmResponse: string, outputFormat: string): any {
    try {
      // 尝试解析JSON
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // 如果不是JSON格式，尝试简单解析
      if (outputFormat === 'simple') {
        const lines = llmResponse.split('\n').filter((line) => line.trim());
        const intents: any[] = [];

        for (const line of lines) {
          const match = line.match(/(.+?)[:：]\s*([0-9.]+)/);
          if (match) {
            intents.push({
              intentName: match[1].trim(),
              confidence: parseFloat(match[2]),
            });
          }
        }

        return { intents, primaryIntent: intents[0]?.intentName };
      }

      throw new Error('Unable to parse intent result');
    } catch (error) {
      this.logger.error(`Failed to parse intent result: ${error.message}`);
      return {
        intents: [],
        primaryIntent: null,
        needsMoreInfo: true,
        clarificationQuestion: '抱歉，我无法理解您的意图，请您再详细描述一下。',
      };
    }
  }

  private validateIntentConfidence(
    intentResult: any,
    threshold: number,
  ): any[] {
    const intents = intentResult.intents || [intentResult];
    return intents
      .filter(
        (intent: any) => intent.confidence && intent.confidence >= threshold,
      )
      .sort((a: any, b: any) => b.confidence - a.confidence);
  }

  private async extractIntentParameters(
    userInput: string,
    intentCategory: any,
    context: Record<string, any>,
    modelName: string,
  ): Promise<{ parameters: Record<string, any>; needsMoreInfo: boolean }> {
    if (
      !intentCategory.requiredParameters ||
      intentCategory.requiredParameters.length === 0
    ) {
      return { parameters: {}, needsMoreInfo: false };
    }

    const parametersDescription = intentCategory.requiredParameters
      .map(
        (param: any) =>
          `- ${param.name} (${param.type}): ${param.description}${param.required ? ' [必需]' : ' [可选]'}`,
      )
      .join('\n');

    const extractionPrompt = `从用户输入中提取以下参数：

用户输入：${userInput}

需要提取的参数：
${parametersDescription}

请以JSON格式返回提取的参数：
{
  "extractedParameters": {
    "参数名": "参数值"
  },
  "missingParameters": ["缺失的必需参数"],
  "needsMoreInfo": true/false,
  "clarificationQuestions": ["需要询问的问题"]
}`;

    try {
      const chatRequest = {
        model: modelName,
        messages: [
          {
            role: 'system' as const,
            content:
              '你是一个参数提取专家，能够从用户输入中准确提取所需的参数信息。',
          },
          {
            role: 'user' as const,
            content: extractionPrompt,
          },
        ],
        temperature: 0.1,
        maxTokens: 500,
      };

      const result = await this.llmService.chat(chatRequest);
      const parsed = this.parseIntentResult(result.content, 'structured');

      return {
        parameters: parsed.extractedParameters || {},
        needsMoreInfo: parsed.needsMoreInfo || false,
      };
    } catch (error) {
      this.logger.error(`Parameter extraction failed: ${error.message}`);
      return { parameters: {}, needsMoreInfo: true };
    }
  }

  private async handleIntentFallback(
    fallbackAction: string,
    userInput: string,
    context: Record<string, any>,
    modelName: string,
  ): Promise<any> {
    switch (fallbackAction) {
      case 'ask_clarification':
        return {
          action: 'ask_clarification',
          message:
            '抱歉，我没有完全理解您的意图。您能否更详细地描述一下您想要做什么？',
          suggestions: [
            '查询信息（如天气、新闻等）',
            '执行操作（如发送邮件、创建任务等）',
            '获取帮助或说明',
          ],
        };

      case 'default_intent':
        return {
          action: 'default_intent',
          intentId: 'general_help',
          intentName: '通用帮助',
          confidence: 0.5,
        };

      case 'human_handoff':
        return {
          action: 'human_handoff',
          message: '您的请求需要人工处理，我已将您转接给人工客服。',
          escalated: true,
        };

      default:
        return {
          action: 'unknown',
          message: '无法识别意图，请重新输入。',
        };
    }
  }

  private generateSuggestedActions(
    validatedIntents: any[],
    intentCategories: any[],
  ): any[] {
    const suggestions: any[] = [];

    for (const intent of validatedIntents) {
      const category = intentCategories.find(
        (cat) => cat.id === intent.intentId || cat.name === intent.intentName,
      );

      if (category) {
        suggestions.push({
          intentId: category.id,
          intentName: category.name,
          description: category.description,
          targetNodeType: category.targetNodeType,
          targetNodeId: category.targetNodeId,
          confidence: intent.confidence,
          requiredParameters: category.requiredParameters || [],
        });
      }
    }

    return suggestions;
  }

  private async executeConditionNode(
    execution: WorkflowExecution,
    node: WorkflowNode,
  ): Promise<any> {
    const {
      condition,
      conditionType = 'simple',
      defaultTargetNodeId,
      routingRules = [],
      valueMatchingConfig,
      routingStrategy = 'first_match',
      enableFallback = true,
      fallbackNodeId,
      debugMode = false,
    } = node.data;

    const context = execution.context || {};
    let routingResult: any = {
      conditionResult: false,
      selectedNodeId: null,
      matchedRules: [],
      debugInfo: {},
    };

    try {
      switch (conditionType) {
        case 'simple':
          // 传统的简单条件判断
          if (!condition) {
            throw new Error('Simple condition node must specify condition');
          }
          const simpleResult = this.evaluateCondition(condition, context);
          routingResult.conditionResult = simpleResult;
          routingResult.selectedNodeId = simpleResult ? 'true' : 'false';
          break;

        case 'smart_router':
          // 智能路由：基于多个规则进行匹配
          routingResult = await this.executeSmartRouting(
            routingRules,
            context,
            routingStrategy,
            debugMode,
          );
          break;

        case 'value_matcher':
          // 值匹配：根据特定字段值匹配到对应节点
          if (!valueMatchingConfig) {
            throw new Error(
              'Value matcher condition node must specify valueMatchingConfig',
            );
          }
          routingResult = await this.executeValueMatching(
            valueMatchingConfig,
            context,
            debugMode,
          );
          break;

        default:
          throw new Error(`Unsupported condition type: ${conditionType}`);
      }

      // 处理默认节点和回退逻辑
      if (!routingResult.selectedNodeId && enableFallback) {
        if (defaultTargetNodeId) {
          routingResult.selectedNodeId = defaultTargetNodeId;
          routingResult.usedDefault = true;
        } else if (fallbackNodeId) {
          routingResult.selectedNodeId = fallbackNodeId;
          routingResult.usedFallback = true;
        }
      }

      if (debugMode) {
        this.logger.log(
          `Condition node ${node.id} routing result:`,
          JSON.stringify(routingResult, null, 2),
        );
      }

      return routingResult;
    } catch (error) {
      this.logger.error(`Condition node execution failed: ${error.message}`);

      // 错误时使用回退策略
      if (enableFallback && (defaultTargetNodeId || fallbackNodeId)) {
        const fallbackTargetNodeId = defaultTargetNodeId || fallbackNodeId;
        return {
          conditionResult: false,
          selectedNodeId: fallbackTargetNodeId,
          error: error.message,
          usedErrorFallback: true,
        };
      }

      throw error;
    }
  }

  // 智能路由执行
  private async executeSmartRouting(
    routingRules: any[],
    context: Record<string, any>,
    strategy: string,
    debugMode: boolean,
  ): Promise<any> {
    const enabledRules = routingRules.filter((rule) => rule.enabled !== false);
    const matchedRules: any[] = [];
    const debugInfo: any = { evaluatedRules: [] };

    // 评估所有规则
    for (const rule of enabledRules) {
      try {
        const ruleResult = await this.evaluateRoutingRule(rule, context);

        if (debugMode) {
          debugInfo.evaluatedRules.push({
            ruleId: rule.id,
            ruleName: rule.name,
            condition: rule.condition,
            result: ruleResult.matched,
            score: ruleResult.score,
            error: ruleResult.error,
          });
        }

        if (ruleResult.matched) {
          matchedRules.push({
            ...rule,
            score: ruleResult.score,
            matchDetails: ruleResult.details,
          });
        }
      } catch (error) {
        this.logger.warn(
          `Rule evaluation failed for rule ${rule.id}: ${error.message}`,
        );
        if (debugMode) {
          debugInfo.evaluatedRules.push({
            ruleId: rule.id,
            ruleName: rule.name,
            error: error.message,
          });
        }
      }
    }

    // 根据策略选择最终节点
    let selectedNodeId: string | null = null;
    let selectedRule: any = null;

    switch (strategy) {
      case 'first_match':
        // 按优先级排序，选择第一个匹配的
        matchedRules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        selectedRule = matchedRules[0];
        break;

      case 'best_match':
        // 选择得分最高的
        matchedRules.sort((a, b) => (b.score || 0) - (a.score || 0));
        selectedRule = matchedRules[0];
        break;

      case 'weighted_score':
        // 综合优先级和权重计算最终得分
        matchedRules.forEach((rule) => {
          const priority = rule.priority || 0;
          const weight = rule.weight || 1;
          const score = rule.score || 0;
          rule.finalScore = (priority * 0.3 + score * 0.7) * weight;
        });
        matchedRules.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));
        selectedRule = matchedRules[0];
        break;
    }

    if (selectedRule) {
      selectedNodeId = selectedRule.targetNodeId;
    }

    return {
      conditionResult: matchedRules.length > 0,
      selectedNodeId,
      matchedRules,
      selectedRule,
      strategy,
      debugInfo: debugMode ? debugInfo : undefined,
    };
  }

  // 评估单个路由规则
  private async evaluateRoutingRule(
    rule: any,
    context: Record<string, any>,
  ): Promise<any> {
    const result = {
      matched: false,
      score: 0,
      details: {},
      error: null,
    };

    try {
      switch (rule.matchType) {
        case 'exact':
          const conditionResult = this.evaluateCondition(
            rule.condition,
            context,
          );
          result.matched = conditionResult;
          result.score = conditionResult ? 1.0 : 0.0;
          break;

        case 'contains':
          if (rule.expectedValue && rule.condition) {
            const actualValue = this.evaluateExpression(
              rule.condition,
              context,
            );
            const contains = String(actualValue)
              .toLowerCase()
              .includes(String(rule.expectedValue).toLowerCase());
            result.matched = contains;
            result.score = contains ? 0.8 : 0.0;
          }
          break;

        case 'regex':
          if (rule.expectedValue && rule.condition) {
            const actualValue = this.evaluateExpression(
              rule.condition,
              context,
            );
            const regex = new RegExp(rule.expectedValue);
            const matches = regex.test(String(actualValue));
            result.matched = matches;
            result.score = matches ? 0.9 : 0.0;
          }
          break;

        case 'range':
          if (rule.expectedValue && rule.tolerance && rule.condition) {
            const actualValue = Number(
              this.evaluateExpression(rule.condition, context),
            );
            const expectedValue = Number(rule.expectedValue);
            const tolerance = Number(rule.tolerance);
            const diff = Math.abs(actualValue - expectedValue);
            result.matched = diff <= tolerance;
            result.score = result.matched
              ? Math.max(0, 1 - diff / tolerance)
              : 0.0;
          }
          break;

        case 'custom':
          if (rule.customMatcher) {
            const func = new Function('context', 'rule', rule.customMatcher);
            const customResult = func(context, rule);
            result.matched = Boolean(customResult.matched || customResult);
            result.score = Number(
              customResult.score || (result.matched ? 1.0 : 0.0),
            );
            result.details = customResult.details || {};
          }
          break;

        default:
          // 默认使用条件表达式
          result.matched = this.evaluateCondition(rule.condition, context);
          result.score = result.matched ? 1.0 : 0.0;
      }
    } catch (error) {
      result.error = error.message;
      this.logger.warn(
        `Rule evaluation error for ${rule.id}: ${error.message}`,
      );
    }

    return result;
  }

  // 值匹配执行
  private async executeValueMatching(
    config: any,
    context: Record<string, any>,
    debugMode: boolean,
  ): Promise<any> {
    const {
      sourceField,
      matchingRules,
      defaultNodeId,
      enableFuzzyMatch,
      fuzzyThreshold = 0.8,
      caseSensitive = false,
    } = config;

    // 获取源字段值
    const sourceValue = this.getNestedValue(context, sourceField);
    if (sourceValue === undefined || sourceValue === null) {
      return {
        conditionResult: false,
        selectedNodeId: defaultNodeId,
        error: `Source field '${sourceField}' not found in context`,
        usedDefault: true,
      };
    }

    const enabledRules = matchingRules.filter(
      (rule: any) => rule.enabled !== false,
    );
    const matchedRules: any[] = [];
    const debugInfo: any = { sourceValue, evaluatedRules: [] };

    // 评估所有匹配规则
    for (const rule of enabledRules) {
      try {
        const ruleResult = this.evaluateValueMatchingRule(
          rule,
          sourceValue,
          caseSensitive,
          enableFuzzyMatch,
          fuzzyThreshold,
        );

        if (debugMode) {
          debugInfo.evaluatedRules.push({
            ruleId: rule.id,
            ruleName: rule.name,
            matchType: rule.matchType,
            result: ruleResult.matched,
            score: ruleResult.score,
          });
        }

        if (ruleResult.matched) {
          matchedRules.push({
            ...rule,
            score: ruleResult.score,
            matchDetails: ruleResult.details,
          });
        }
      } catch (error) {
        this.logger.warn(
          `Value matching rule evaluation failed for rule ${rule.id}: ${error.message}`,
        );
      }
    }

    // 按优先级和得分排序
    matchedRules.sort((a, b) => {
      const priorityDiff = (b.priority || 0) - (a.priority || 0);
      if (priorityDiff !== 0) return priorityDiff;
      return (b.score || 0) - (a.score || 0);
    });

    const selectedRule = matchedRules[0];
    const selectedNodeId = selectedRule
      ? selectedRule.targetNodeId
      : defaultNodeId;

    return {
      conditionResult: matchedRules.length > 0,
      selectedNodeId,
      matchedRules,
      selectedRule,
      sourceValue,
      usedDefault: !selectedRule && defaultNodeId,
      debugInfo: debugMode ? debugInfo : undefined,
    };
  }

  // 评估值匹配规则
  private evaluateValueMatchingRule(
    rule: any,
    sourceValue: any,
    caseSensitive: boolean,
    enableFuzzyMatch: boolean,
    fuzzyThreshold: number,
  ): any {
    const result = {
      matched: false,
      score: 0,
      details: {},
    };

    const sourceStr = caseSensitive
      ? String(sourceValue)
      : String(sourceValue).toLowerCase();

    for (const matchValue of rule.matchValues) {
      const matchStr = caseSensitive
        ? String(matchValue)
        : String(matchValue).toLowerCase();
      let matched = false;
      let score = 0;

      switch (rule.matchType) {
        case 'exact':
          matched = sourceStr === matchStr;
          score = matched ? 1.0 : 0.0;
          break;

        case 'contains':
          matched = sourceStr.includes(matchStr);
          score = matched ? 0.8 : 0.0;
          break;

        case 'startsWith':
          matched = sourceStr.startsWith(matchStr);
          score = matched ? 0.9 : 0.0;
          break;

        case 'endsWith':
          matched = sourceStr.endsWith(matchStr);
          score = matched ? 0.9 : 0.0;
          break;

        case 'regex':
          try {
            const regex = new RegExp(matchStr, caseSensitive ? 'g' : 'gi');
            matched = regex.test(sourceStr);
            score = matched ? 0.95 : 0.0;
          } catch (error) {
            this.logger.warn(`Invalid regex pattern: ${matchStr}`);
          }
          break;

        case 'range':
          const numSource = Number(sourceValue);
          const numMatch = Number(matchValue);
          if (!isNaN(numSource) && !isNaN(numMatch)) {
            const min = rule.rangeMin !== undefined ? rule.rangeMin : numMatch;
            const max = rule.rangeMax !== undefined ? rule.rangeMax : numMatch;
            matched = numSource >= min && numSource <= max;
            score = matched ? 1.0 : 0.0;
          }
          break;
      }

      // 模糊匹配
      if (!matched && enableFuzzyMatch && rule.matchType === 'exact') {
        const similarity = this.calculateStringSimilarity(sourceStr, matchStr);
        if (similarity >= fuzzyThreshold) {
          matched = true;
          score = similarity;
        }
      }

      if (matched) {
        result.matched = true;
        result.score = Math.max(result.score, score);
        result.details = {
          matchedValue: matchValue,
          matchType: rule.matchType,
          score,
        };
        break; // 找到匹配就停止
      }
    }

    return result;
  }

  // 计算字符串相似度（简单的编辑距离算法）
  private calculateStringSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    const matrix: number[][] = [];

    // 初始化矩阵
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // 计算编辑距离
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // 删除
          matrix[i][j - 1] + 1, // 插入
          matrix[i - 1][j - 1] + cost, // 替换
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    const editDistance = matrix[len1][len2];
    return (maxLen - editDistance) / maxLen;
  }

  // 获取嵌套对象的值
  private getNestedValue(obj: any, path: string): any {
    if (!path || !obj) return undefined;

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }

      // 支持数组索引访问，如 items[0]
      if (key.includes('[') && key.includes(']')) {
        const arrayKey = key.substring(0, key.indexOf('['));
        const indexStr = key.substring(key.indexOf('[') + 1, key.indexOf(']'));
        const index = parseInt(indexStr, 10);

        if (arrayKey) {
          current = current[arrayKey];
        }

        if (Array.isArray(current) && !isNaN(index)) {
          current = current[index];
        } else {
          return undefined;
        }
      } else {
        current = current[key];
      }
    }

    return current;
  }

  // 评估表达式（简化版本）
  private evaluateExpression(
    expression: string,
    context: Record<string, any>,
  ): any {
    try {
      // 简单的变量替换
      let processedExpression = expression;

      // 替换上下文变量
      const variablePattern = /\$\{([^}]+)\}/g;
      processedExpression = processedExpression.replace(
        variablePattern,
        (match, varPath) => {
          const value = this.getNestedValue(context, varPath.trim());
          if (typeof value === 'string') {
            return `"${value}"`;
          }
          return value !== undefined ? String(value) : 'undefined';
        },
      );

      // 替换简单的变量引用（如 $variable）
      const simpleVarPattern = /\$([a-zA-Z_][a-zA-Z0-9_]*)/g;
      processedExpression = processedExpression.replace(
        simpleVarPattern,
        (match, varName) => {
          const value = context[varName];
          if (typeof value === 'string') {
            return `"${value}"`;
          }
          return value !== undefined ? String(value) : 'undefined';
        },
      );

      // 安全评估表达式
      const func = new Function(
        'context',
        `
        with (context) {
          return ${processedExpression};
        }
      `,
      );

      return func(context);
    } catch (error) {
      this.logger.warn(
        `Expression evaluation failed: ${expression}, error: ${error.message}`,
      );
      return undefined;
    }
  }

  private async executeUserInputNode(
    execution: WorkflowExecution,
    node: WorkflowNode,
  ): Promise<any> {
    execution.status = ExecutionStatus.WAITING_INPUT;
    await this.executionRepository.save(execution);

    // 发射节点等待事件
    this.eventEmitter.emit('node.execution.waiting', {
      execution,
      node,
      waitingFor: 'user_input',
    });

    this.eventEmitter.emit('workflow.waiting_input', { execution, node });
    return { waitingForInput: true };
  }

  private async executeWaitEventNode(
    execution: WorkflowExecution,
    node: WorkflowNode,
  ): Promise<any> {
    const { eventType, eventCondition } = node.data;

    execution.status = ExecutionStatus.WAITING_EVENT;
    await this.executionRepository.save(execution);

    // 发射节点等待事件
    this.eventEmitter.emit('node.execution.waiting', {
      execution,
      node,
      waitingFor: `event:${eventType}`,
    });

    this.eventEmitter.emit('workflow.waiting_event', {
      execution,
      node,
      eventType,
      eventCondition,
    });

    return { waitingForEvent: true, eventType, eventCondition };
  }

  private async executeApprovalNode(
    execution: WorkflowExecution,
    node: WorkflowNode,
  ): Promise<any> {
    const { approvers } = node.data;

    execution.status = ExecutionStatus.WAITING_APPROVAL;
    await this.executionRepository.save(execution);

    // 发射节点等待事件
    this.eventEmitter.emit('node.execution.waiting', {
      execution,
      node,
      waitingFor: 'approval',
    });

    this.eventEmitter.emit('workflow.waiting_approval', {
      execution,
      node,
      approvers,
    });

    return { waitingForApproval: true, approvers };
  }

  private async executeScriptNode(
    execution: WorkflowExecution,
    node: WorkflowNode,
  ): Promise<any> {
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

  private async executeDelayNode(
    execution: WorkflowExecution,
    node: WorkflowNode,
  ): Promise<any> {
    const { delayMs } = node.data;
    if (!delayMs) {
      throw new Error('Delay node must specify delayMs');
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return { delayed: true, delayMs };
  }

  private async executeLoopStartNode(
    execution: WorkflowExecution,
    node: WorkflowNode,
  ): Promise<any> {
    const {
      loopId,
      maxIterations = 100,
      exitCondition,
      exitEventType,
      exitEventCondition,
      exitKeyword,
    } = node.data;

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
      this.logger.log(
        `Loop ${loopId} iteration ${existingLoop.currentIteration}`,
      );
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
        exitKeyword,
      } as LoopState;
      this.logger.log(`Starting loop ${loopId}`);
    }

    await this.executionRepository.save(execution);
    return {
      loopStarted: true,
      loopId,
      currentIteration: execution.context.loops[loopId].currentIteration,
      timestamp: new Date(),
    };
  }

  private async executeLoopEndNode(
    execution: WorkflowExecution,
    node: WorkflowNode,
  ): Promise<any> {
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
      this.logger.log(
        `Exiting loop ${loopId} after ${loopState.currentIteration} iterations`,
      );
      await this.executionRepository.save(execution);
      return {
        loopExited: true,
        loopId,
        totalIterations: loopState.currentIteration,
        exitReason: shouldExit.reason,
        timestamp: new Date(),
      };
    } else {
      // 继续循环 - 跳转回loop_start节点
      const startNode = execution.workflow.nodes.find(
        (n) => n.id === loopState.startNodeId,
      );
      if (startNode) {
        this.logger.log(`Continuing loop ${loopId}, jumping to start node`);
        // 直接执行开始节点，不通过continueToNextNode
        await this.executeNode(execution, startNode, execution.workflow);
        return {
          loopContinued: true,
          loopId,
          currentIteration: loopState.currentIteration,
          timestamp: new Date(),
        };
      } else {
        throw new Error(`Loop start node not found: ${loopState.startNodeId}`);
      }
    }
  }

  private async executeLoopConditionNode(
    execution: WorkflowExecution,
    node: WorkflowNode,
  ): Promise<any> {
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
    const conditionResult = condition
      ? this.evaluateCondition(condition, {
          ...execution.context,
          currentIteration: loopState.currentIteration,
          maxIterations: loopState.maxIterations,
        })
      : true;

    return {
      loopConditionResult: conditionResult,
      loopId,
      currentIteration: loopState.currentIteration,
    };
  }

  private async checkLoopExitConditions(
    execution: WorkflowExecution,
    loopState: LoopState,
  ): Promise<{ exit: boolean; reason: string } | null> {
    // 检查最大迭代次数
    if (loopState.currentIteration >= loopState.maxIterations) {
      return { exit: true, reason: 'max_iterations_reached' };
    }

    // 检查退出条件
    if (loopState.exitCondition && execution.context) {
      const exitResult = this.evaluateCondition(loopState.exitCondition, {
        ...execution.context,
        currentIteration: loopState.currentIteration,
        maxIterations: loopState.maxIterations,
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
        if (
          !loopState.exitEventCondition ||
          this.evaluateCondition(
            loopState.exitEventCondition,
            execution.context.eventData,
          )
        ) {
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
    result?: any,
  ): Promise<void> {
    // Find outgoing edges from current node
    const outgoingEdges = workflow.edges.filter(
      (edge) => edge.source === currentNode.id,
    );

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
      // Enhanced condition node routing
      const conditionType = currentNode.data.conditionType || 'simple';

      if (conditionType === 'simple') {
        // Traditional condition routing based on edge conditions
        const conditionResult = result?.conditionResult;
        edgeToFollow = outgoingEdges.find((edge) => {
          if (!edge.condition) return false;
          return this.evaluateCondition(edge.condition, {
            ...execution.context,
            result: conditionResult,
          });
        });
      } else {
        // Smart routing or value matching - use selectedNodeId from result
        const selectedNodeId = result?.selectedNodeId;

        if (selectedNodeId) {
          // First try to find direct edge to the selected node
          edgeToFollow = outgoingEdges.find(
            (edge) => edge.target === selectedNodeId,
          );

          // If no direct edge found, try to find edge with matching condition
          if (!edgeToFollow) {
            edgeToFollow = outgoingEdges.find((edge) => {
              if (!edge.condition) return false;
              // Support special routing conditions
              if (edge.condition === 'selectedNode') {
                return true;
              }
              // Support node ID matching
              if (edge.condition.includes(selectedNodeId)) {
                return this.evaluateCondition(edge.condition, {
                  ...execution.context,
                  selectedNodeId,
                  result,
                });
              }
              return false;
            });
          }

          // If still no edge found, try to find the target node directly
          if (!edgeToFollow) {
            const targetNode = workflow.nodes.find(
              (node) => node.id === selectedNodeId,
            );
            if (targetNode) {
              // Create a virtual edge for direct routing
              edgeToFollow = {
                id: `virtual-${currentNode.id}-${selectedNodeId}`,
                source: currentNode.id,
                target: selectedNodeId,
                label: 'Smart Route',
              };
            }
          }
        }

        // Fallback to default routing if no specific route found
        if (!edgeToFollow && result?.usedDefault) {
          edgeToFollow = outgoingEdges.find(
            (edge) =>
              edge.condition === 'default' ||
              edge.label?.toLowerCase().includes('default') ||
              !edge.condition,
          );
        }
      }
    } else if (currentNode.type === 'intent_recognition') {
      // Enhanced intent recognition node routing
      const primaryIntent = result?.primaryIntent;
      const needsClarification = result?.needsClarification;
      const suggestedActions = result?.suggestedActions || [];

      // First priority: Direct intent routing based on targetNodeId
      if (primaryIntent && !needsClarification && suggestedActions.length > 0) {
        const primaryAction = suggestedActions[0];
        if (primaryAction.targetNodeId) {
          // Try to find direct edge to target node
          edgeToFollow = outgoingEdges.find(
            (edge) => edge.target === primaryAction.targetNodeId,
          );

          // If no direct edge, create virtual edge for direct routing
          if (!edgeToFollow) {
            const targetNode = workflow.nodes.find(
              (node) => node.id === primaryAction.targetNodeId,
            );
            if (targetNode) {
              edgeToFollow = {
                id: `virtual-intent-${currentNode.id}-${primaryAction.targetNodeId}`,
                source: currentNode.id,
                target: primaryAction.targetNodeId,
                label: `Intent: ${primaryIntent.intentName}`,
              };
              this.logger.log(
                `Intent recognition: Direct routing to ${primaryAction.targetNodeId} for intent ${primaryIntent.intentId}`,
              );
            }
          }
        }
      }

      // Second priority: Condition-based routing
      if (!edgeToFollow) {
        edgeToFollow = outgoingEdges.find((edge) => {
          if (!edge.condition) return false;
          return this.evaluateCondition(edge.condition, {
            ...execution.context,
            result,
          });
        });
      }

      // Third priority: Default routing for clarification or fallback
      if (!edgeToFollow && needsClarification) {
        edgeToFollow = outgoingEdges.find(
          (edge) =>
            edge.condition === 'clarification' ||
            edge.label?.toLowerCase().includes('clarification') ||
            edge.condition === 'fallback' ||
            edge.label?.toLowerCase().includes('fallback'),
        );
      }

      // Fourth priority: First available edge (backward compatibility)
      if (!edgeToFollow) {
        edgeToFollow = outgoingEdges[0];
      }
    } else {
      // For other nodes, take the first edge (or implement more complex logic)
      edgeToFollow = outgoingEdges[0];
    }

    if (!edgeToFollow) {
      // Enhanced error handling with fallback options
      if (currentNode.type === 'condition' && currentNode.data.enableFallback) {
        const defaultNodeId =
          currentNode.data.defaultTargetNodeId ||
          currentNode.data.fallbackNodeId;
        if (defaultNodeId) {
          const targetNode = workflow.nodes.find(
            (node) => node.id === defaultNodeId,
          );
          if (targetNode) {
            this.logger.warn(
              `Using fallback node ${defaultNodeId} for condition node ${currentNode.id}`,
            );
            await this.executeNode(execution, targetNode, workflow);
            return;
          }
        }
      }

      // Enhanced error handling for intent recognition nodes
      if (currentNode.type === 'intent_recognition') {
        // Try to find a default or fallback node
        const fallbackNode = workflow.nodes.find(
          (node) =>
            node.type === 'llm' &&
            (node.label?.toLowerCase().includes('clarification') ||
              node.label?.toLowerCase().includes('fallback') ||
              node.label?.toLowerCase().includes('help')),
        );

        if (fallbackNode) {
          this.logger.warn(
            `Using fallback node ${fallbackNode.id} for intent recognition node ${currentNode.id}`,
          );
          await this.executeNode(execution, fallbackNode, workflow);
          return;
        }
      }

      throw new Error(
        `No valid edge found from node ${currentNode.id}. Available edges: ${outgoingEdges.map((e) => `${e.target}(${e.condition || 'no condition'})`).join(', ')}`,
      );
    }

    // Find target node
    const targetNode = workflow.nodes.find(
      (node) => node.id === edgeToFollow.target,
    );
    if (!targetNode) {
      throw new Error(`Target node ${edgeToFollow.target} not found`);
    }

    // Continue execution with target node
    await this.executeNode(execution, targetNode, workflow);
  }

  private mergeVariables(template: any, context: Record<string, any>): any {
    if (typeof template === 'string') {
      // Enhanced variable replacement with multiple patterns
      return (
        template
          // Pattern 1: {{nodeId.field}} - Reference specific node output field
          .replace(
            /\{\{([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_.[\]]+)\}\}/g,
            (match, nodeId, fieldPath) => {
              const nodeOutput = context.nodeOutputs?.[nodeId];
              if (nodeOutput) {
                return this.getNestedValue(nodeOutput, fieldPath) || match;
              }
              return match;
            },
          )
          // Pattern 2: {{nodes.nodeId.field}} - Alternative syntax for node reference
          .replace(
            /\{\{nodes\.([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_.[\]]+)\}\}/g,
            (match, nodeId, fieldPath) => {
              const nodeOutput = context.nodeOutputs?.[nodeId];
              if (nodeOutput) {
                return this.getNestedValue(nodeOutput, fieldPath) || match;
              }
              return match;
            },
          )
          // Pattern 3: {{$nodeId}} - Reference entire node output
          .replace(/\{\{\$([a-zA-Z0-9_-]+)\}\}/g, (match, nodeId) => {
            const nodeOutput = context.nodeOutputs?.[nodeId];
            if (nodeOutput) {
              return JSON.stringify(nodeOutput);
            }
            return match;
          })
          // Pattern 4: {{field}} - Reference global context field (backward compatibility)
          .replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, key) => {
            return context[key] !== undefined ? context[key] : match;
          })
          // Pattern 5: {{expr:expression}} - Evaluate JavaScript expression
          .replace(/\{\{expr:(.+?)\}\}/g, (match, expression) => {
            try {
              return this.evaluateExpression(expression, context);
            } catch (error) {
              this.logger.warn(
                `Expression evaluation failed: ${expression} - ${error.message}`,
              );
              return match;
            }
          })
      );
    } else if (typeof template === 'object' && template !== null) {
      // Handle special input mapping object
      if (template._inputMapping) {
        return this.processInputMapping(template._inputMapping, context);
      }

      // Recursively merge variables in object
      const result: any = {};
      for (const [key, value] of Object.entries(template)) {
        result[key] = this.mergeVariables(value, context);
      }
      return result;
    }
    return template;
  }

  // Helper method to process input mapping configuration
  private processInputMapping(
    mapping: Record<string, string>,
    context: Record<string, any>,
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [outputKey, sourceExpression] of Object.entries(mapping)) {
      if (typeof sourceExpression === 'string') {
        // Process the source expression as a template
        result[outputKey] = this.mergeVariables(sourceExpression, context);
      } else {
        result[outputKey] = sourceExpression;
      }
    }

    return result;
  }

  private evaluateCondition(
    condition: string,
    context: Record<string, any>,
  ): boolean {
    try {
      // Simple condition evaluation (in production, use a proper expression evaluator)
      const func = new Function(
        'context',
        `with(context) { return ${condition}; }`,
      );
      return Boolean(func(context));
    } catch (error) {
      this.logger.error(`Condition evaluation failed: ${error.message}`);
      return false;
    }
  }

  async continueExecution(
    executionId: string,
    input: Record<string, any>,
  ): Promise<void> {
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
    const currentNode = execution.workflow.nodes.find(
      (node) => node.id === execution.currentNodeId,
    );
    if (currentNode) {
      await this.continueToNextNode(
        execution,
        currentNode,
        execution.workflow,
        input,
      );
    }
  }

  async handleApproval(
    executionId: string,
    approved: boolean,
    comment?: string,
  ): Promise<void> {
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
      approvalTimestamp: new Date(),
    };
    execution.status = ExecutionStatus.RUNNING;
    await this.executionRepository.save(execution);

    // Find current node and continue
    const currentNode = execution.workflow.nodes.find(
      (node) => node.id === execution.currentNodeId,
    );
    if (currentNode) {
      await this.continueToNextNode(
        execution,
        currentNode,
        execution.workflow,
        { approved },
      );
    }
  }

  async handleEvent(eventType: string, eventData: any): Promise<void> {
    // Find executions waiting for this event type
    const waitingExecutions = await this.executionRepository.find({
      where: { status: ExecutionStatus.WAITING_EVENT },
      relations: ['workflow', 'user'],
    });

    for (const execution of waitingExecutions) {
      const currentNode = execution.workflow.nodes.find(
        (node) => node.id === execution.currentNodeId,
      );
      if (currentNode && currentNode.data.eventType === eventType) {
        // Check if event condition is met
        const eventCondition = currentNode.data.eventCondition;
        if (
          !eventCondition ||
          this.evaluateCondition(eventCondition, eventData)
        ) {
          // Update context with event data
          execution.context = { ...execution.context, eventData };
          execution.status = ExecutionStatus.RUNNING;
          await this.executionRepository.save(execution);

          // Continue execution
          await this.continueToNextNode(
            execution,
            currentNode,
            execution.workflow,
            eventData,
          );
        }
      }
    }
  }

  // 并发执行相关方法
  private async executeParallelStartNode(
    execution: WorkflowExecution,
    node: WorkflowNode,
    workflow: Workflow,
  ): Promise<any> {
    const {
      parallelId,
      parallelStrategy = 'wait_all',
      parallelTimeout,
      failureStrategy = 'fail_fast',
    } = node.data;

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
      throw new Error(
        `No parallel branches found for parallelId: ${parallelId}`,
      );
    }

    // 创建并发状态
    const parallelState: ParallelState = {
      parallelId,
      strategy: parallelStrategy,
      timeout: parallelTimeout,
      startTime: new Date(),
      branches: parallelBranches.map((branch) => ({
        branchId: branch.id,
        branchName: branch.data.branchName || branch.label,
        startNodeId: branch.id,
        status: 'pending',
      })),
      completedBranches: [],
      failedBranches: [],
      results: {},
      isCompleted: false,
      failureStrategy,
    };

    execution.context.parallels[parallelId] = parallelState;
    await this.executionRepository.save(execution);

    // 启动所有并行分支
    this.logger.log(
      `Starting parallel execution for ${parallelBranches.length} branches`,
    );

    for (const branch of parallelBranches) {
      this.executeBranchAsync(execution, branch, workflow, parallelId);
    }

    return {
      parallelStarted: true,
      parallelId,
      branchCount: parallelBranches.length,
      strategy: parallelStrategy,
      timestamp: new Date(),
    };
  }

  private async executeParallelEndNode(
    execution: WorkflowExecution,
    node: WorkflowNode,
  ): Promise<any> {
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

      this.logger.log(
        `Waiting for parallel branches to complete: ${shouldComplete.reason}`,
      );
      return {
        parallelWaiting: true,
        parallelId,
        reason: shouldComplete.reason,
        completedBranches: parallelState.completedBranches.length,
        totalBranches: parallelState.branches.length,
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
        throw new Error(
          `Aggregation script execution failed: ${error.message}`,
        );
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
      timestamp: new Date(),
    };
  }

  private async executeParallelBranchNode(
    execution: WorkflowExecution,
    node: WorkflowNode,
  ): Promise<any> {
    const { parallelId, branchName } = node.data;

    if (!parallelId) {
      throw new Error('Parallel branch node must specify parallelId');
    }

    return {
      parallelBranch: true,
      parallelId,
      branchName: branchName || node.label,
      branchId: node.id,
      timestamp: new Date(),
    };
  }

  private findParallelBranches(
    workflow: Workflow,
    parallelId: string,
  ): WorkflowNode[] {
    return workflow.nodes.filter(
      (node) =>
        node.type === 'parallel_branch' && node.data.parallelId === parallelId,
    );
  }

  private async executeBranchAsync(
    execution: WorkflowExecution,
    branchNode: WorkflowNode,
    workflow: Workflow,
    parallelId: string,
  ): Promise<void> {
    try {
      // 创建分支执行上下文
      const branchContext = { ...execution.context };

      // 更新分支状态
      const parallelState = execution.context?.parallels?.[parallelId];
      const branch = parallelState?.branches.find(
        (b) => b.branchId === branchNode.id,
      );
      if (branch) {
        branch.status = 'running';
        branch.startTime = new Date();
      }

      this.logger.log(`Starting parallel branch: ${branchNode.id}`);

      // 执行分支节点
      const branchResult = await this.executeBranchNode(
        branchNode,
        branchContext,
        workflow,
      );

      // 更新分支完成状态
      if (branch) {
        branch.status = 'completed';
        branch.result = branchResult;
        branch.endTime = new Date();
      }

      if (parallelState) {
        parallelState.completedBranches.push(branchNode.id);
        parallelState.results[branchNode.data.branchName || branchNode.label] =
          branchResult;
      }

      this.logger.log(`Parallel branch completed: ${branchNode.id}`);

      // 检查是否需要继续执行
      await this.checkParallelCompletion(execution, parallelId);
    } catch (error) {
      this.logger.error(
        `Parallel branch failed: ${branchNode.id} - ${error.message}`,
      );

      const parallelState = execution.context?.parallels?.[parallelId];
      const branch = parallelState?.branches.find(
        (b) => b.branchId === branchNode.id,
      );
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
    workflow: Workflow,
  ): Promise<any> {
    // 根据节点类型执行相应逻辑
    switch (node.type) {
      case 'tool':
        return await this.executeBranchToolNode(node, context);
      case 'agent':
        return await this.executeBranchAgentNode(node, context);
      case 'script':
        return await this.executeBranchScriptNode(node, context);
      case 'mcp_tool':
        return await this.executeBranchMcpToolNode(node, context);
      default:
        throw new Error(`Unsupported parallel branch node type: ${node.type}`);
    }
  }

  private async executeBranchToolNode(
    node: WorkflowNode,
    context: Record<string, any>,
  ): Promise<any> {
    const { toolId, ...params } = node.data;
    if (!toolId) {
      throw new Error('Tool node must specify toolId');
    }

    const mergedParams = this.mergeVariables(params, context);
    // 注意：这里需要传入用户信息，但在并发执行中可能需要从执行上下文获取
    // 简化处理，实际使用时需要完善用户信息传递
    const result = await this.toolService.execute(
      toolId,
      mergedParams,
      null as any,
    );
    return { toolResult: result };
  }

  private async executeBranchAgentNode(
    node: WorkflowNode,
    context: Record<string, any>,
  ): Promise<any> {
    const { agentId, conversationId, message } = node.data;
    if (!agentId) {
      throw new Error('Agent node must specify agentId');
    }

    const mergedMessage = this.mergeVariables(message, context);
    // Use a default conversation ID if not provided
    const finalConversationId = conversationId || `branch-${node.id}`;

    // 注意：这里需要传入用户信息，实际使用时需要完善
    const result = await this.agentService.chat(
      agentId,
      finalConversationId,
      { message: mergedMessage },
      null as any,
    );

    return { agentResponse: result.message };
  }

  private async executeBranchScriptNode(
    node: WorkflowNode,
    context: Record<string, any>,
  ): Promise<any> {
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

  private async executeBranchMcpToolNode(
    node: WorkflowNode,
    context: Record<string, any>,
  ): Promise<any> {
    const {
      mcpServerId,
      mcpServerName,
      mcpToolName,
      mcpArguments = {},
      mcpTimeout = 30000,
      mcpRetryAttempts = 3,
      mcpRetryDelay = 1000,
    } = node.data;

    if (!mcpToolName) {
      throw new Error('MCP tool node must specify mcpToolName');
    }

    if (!mcpServerId && !mcpServerName) {
      throw new Error(
        'MCP tool node must specify either mcpServerId or mcpServerName',
      );
    }

    // Merge context variables into arguments
    const mergedArguments = this.mergeVariables(mcpArguments, context);

    let result: any;

    // Retry logic
    for (let attempt = 1; attempt <= mcpRetryAttempts; attempt++) {
      try {
        this.logger.log(
          `Executing MCP tool ${mcpToolName} in parallel branch (attempt ${attempt}/${mcpRetryAttempts})`,
        );

        if (mcpServerId) {
          // Execute by server ID
          result = await Promise.race([
            this.mcpService.executeTool(
              mcpServerId,
              {
                toolName: mcpToolName,
                arguments: mergedArguments,
              },
              null as any,
            ),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error('MCP tool execution timeout')),
                mcpTimeout,
              ),
            ),
          ]);
        } else if (mcpServerName) {
          // Execute by server name and tool name
          result = await Promise.race([
            this.mcpService.executeToolByName(
              mcpServerName,
              mcpToolName,
              mergedArguments,
              null as any,
            ),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error('MCP tool execution timeout')),
                mcpTimeout,
              ),
            ),
          ]);
        }

        // Success - break out of retry loop
        break;
      } catch (error: any) {
        this.logger.warn(
          `MCP tool execution attempt ${attempt} failed: ${error.message}`,
        );

        // If this is the last attempt, throw the error
        if (attempt === mcpRetryAttempts) {
          throw new Error(
            `MCP tool execution failed after ${mcpRetryAttempts} attempts: ${error.message}`,
          );
        }

        // Wait before retrying
        if (mcpRetryDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, mcpRetryDelay));
        }
      }
    }

    this.logger.log(
      `MCP tool ${mcpToolName} executed successfully in parallel branch`,
    );

    return {
      mcpToolResult: result,
      mcpToolName,
      mcpServerName: mcpServerName || 'unknown',
      executionTime: new Date(),
    };
  }

  private shouldCompleteParallel(parallelState: ParallelState): {
    complete: boolean;
    reason: string;
  } {
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
        return {
          complete: false,
          reason: `waiting for ${runningCount} branches`,
        };

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

  private async checkParallelCompletion(
    execution: WorkflowExecution,
    parallelId: string,
  ): Promise<void> {
    if (!execution.context?.parallels) return;

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
        const parallelEndNode = execution.workflow.nodes.find(
          (node) =>
            node.type === 'parallel_end' && node.data.parallelId === parallelId,
        );

        if (parallelEndNode) {
          await this.executeNode(
            execution,
            parallelEndNode,
            execution.workflow,
          );
        }
      }
    }
  }
}
