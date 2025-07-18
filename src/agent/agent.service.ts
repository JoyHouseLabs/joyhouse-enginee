import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from './entities/agent.entity';
import { RoleCard } from './entities/role-card.entity';
import { Conversation } from './entities/conversation.entity';
import {
  ConversationHistory,
  MessageRole,
} from './entities/conversation-history.entity';
import { CreateAgentDto, UpdateAgentDto } from './dto/agent.dto';
import { CreateRoleCardDto, UpdateRoleCardDto } from './dto/role-card.dto';
import {
  CreateConversationDto,
  UpdateConversationDto,
  CreateMessageDto,
} from './dto/conversation.dto';
import { ChatRequestDto } from './dto/chat.dto';
import { User } from '../user/user.entity';
import { LlmService } from '../llm/llm.service';
import { ToolService } from '../tool/tool.service';
import { McpService } from '../mcp/services/mcp.service';
import { WorkflowService } from '../workflow/workflow.service';
import { AgentRealtimeGateway } from './gateways/agent-realtime.gateway';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable } from 'rxjs';

// 意图识别结果接口
interface IntentRecognitionResult {
  recognizedIntents: Array<{
    intentId: string;
    intentName: string;
    confidence: number;
    reasoning?: string;
  }>;
  primaryIntent: {
    intentId: string;
    intentName: string;
    confidence: number;
  } | null;
  extractedParameters: Record<string, any>;
  needsClarification: boolean;
  suggestedActions: Array<{
    actionType: 'tool' | 'mcp_tool' | 'workflow' | 'clarification';
    actionId?: string;
    actionName?: string;
    description?: string;
    parameters?: Record<string, any>;
  }>;
}

// 动作执行结果接口
interface ActionExecutionResult {
  actionType: 'tool' | 'mcp_tool' | 'workflow' | 'clarification';
  actionId: string;
  success: boolean;
  result?: any;
  error?: string;
  executionTime?: number;
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    @InjectRepository(RoleCard)
    private readonly roleCardRepo: Repository<RoleCard>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(ConversationHistory)
    private readonly historyRepo: Repository<ConversationHistory>,
    private readonly llmService: LlmService,
    private readonly toolService: ToolService,
    private readonly mcpService: McpService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly agentRealtimeGateway: AgentRealtimeGateway,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createAgentDto: CreateAgentDto, user: User): Promise<Agent> {
    const agent = this.agentRepo.create({
      ...createAgentDto,
      user,
    });
    return this.agentRepo.save(agent);
  }

  async findAll(user: User): Promise<Agent[]> {
    return this.agentRepo.find({
      where: { user: { id: user.id } },
      relations: ['conversations'],
    });
  }

  async findOne(id: string, user: User): Promise<Agent> {
    const agent = await this.agentRepo.findOne({
      where: { id, user: { id: user.id } },
      relations: ['conversations'],
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }

    return agent;
  }

  async update(
    id: string,
    updateAgentDto: UpdateAgentDto,
    user: User,
  ): Promise<Agent> {
    const agent = await this.findOne(id, user);
    Object.assign(agent, updateAgentDto);
    return this.agentRepo.save(agent);
  }

  async remove(id: string, user: User): Promise<void> {
    const agent = await this.findOne(id, user);
    await this.agentRepo.remove(agent);
  }

  async createConversation(
    createConversationDto: CreateConversationDto,
    user: User,
  ): Promise<Conversation> {
    const agent = await this.findOne(createConversationDto.agentId, user);
    const conversation = this.conversationRepo.create({
      name: createConversationDto.name,
      user,
      agent,
    });
    return this.conversationRepo.save(conversation);
  }

  async findAllConversations(
    agentId: string,
    user: User,
  ): Promise<Conversation[]> {
    const agent = await this.findOne(agentId, user);
    return this.conversationRepo.find({
      where: { agent: { id: agent.id }, user: { id: user.id } },
      relations: ['history'],
    });
  }

  async findOneConversation(id: string, user: User): Promise<Conversation> {
    const conversation = await this.conversationRepo.findOne({
      where: { id, user: { id: user.id } },
      relations: ['history', 'agent'],
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }

    return conversation;
  }

  async updateConversation(
    id: string,
    updateConversationDto: UpdateConversationDto,
    user: User,
  ): Promise<Conversation> {
    const conversation = await this.findOneConversation(id, user);
    Object.assign(conversation, updateConversationDto);
    return this.conversationRepo.save(conversation);
  }

  async removeConversation(id: string, user: User): Promise<void> {
    const conversation = await this.findOneConversation(id, user);
    await this.conversationRepo.remove(conversation);
  }

  async addMessage(
    conversationId: string,
    createMessageDto: CreateMessageDto,
    user: User,
  ): Promise<ConversationHistory> {
    const conversation = await this.findOneConversation(conversationId, user);
    const message = this.historyRepo.create({
      ...createMessageDto,
      conversation,
    });
    return this.historyRepo.save(message);
  }

  async getConversationHistory(
    conversationId: string,
    user: User,
  ): Promise<ConversationHistory[]> {
    const conversation = await this.findOneConversation(conversationId, user);
    return this.historyRepo.find({
      where: { conversation: { id: conversation.id } },
      order: { createdAt: 'ASC' },
    });
  }

  async chat(
    agentId: string,
    conversationId: string,
    chatRequestDto: ChatRequestDto,
    user: User,
  ): Promise<any> {
    const agent = await this.findOne(agentId, user);
    const conversation = await this.findOneConversation(conversationId, user);

    if (conversation.agent.id !== agentId) {
      throw new NotFoundException('Conversation does not belong to this agent');
    }

    // 发射聊天开始事件
    this.eventEmitter.emit('agent.chat.started', {
      conversationId,
      agentId,
      userMessage: chatRequestDto.message,
      userId: user.id,
    });

    try {
      // Save user message
      await this.addMessage(
        conversationId,
        {
          role: MessageRole.USER,
          content: chatRequestDto.message,
        },
        user,
      );

      // Get conversation history
      const history = await this.getConversationHistory(conversationId, user);

      // 1. 执行意图识别
      const intentResult = await this.performIntentRecognition(
        chatRequestDto.message,
        history,
        agent,
        user,
      );

      // 发射意图识别事件
      this.eventEmitter.emit('agent.intent.recognized', {
        conversationId,
        agentId,
        userMessage: chatRequestDto.message,
        recognizedIntents: intentResult.recognizedIntents,
        primaryIntent: intentResult.primaryIntent,
        suggestedActions: intentResult.suggestedActions,
        confidence: intentResult.primaryIntent?.confidence || 0,
        timestamp: new Date(),
      });

      let finalResponse: string;
      let executionResults: ActionExecutionResult[] = [];

      if (intentResult.needsClarification) {
        // 需要澄清的情况
        finalResponse = await this.generateClarificationResponse(
          intentResult,
          agent,
        );
      } else if (intentResult.suggestedActions.length > 0) {
        // 执行建议的动作
        executionResults = await this.executeSuggestedActions(
          intentResult.suggestedActions,
          user,
          conversationId,
          agentId,
        );

        // 基于执行结果生成回复
        finalResponse = await this.generateActionBasedResponse(
          chatRequestDto.message,
          intentResult,
          executionResults,
          agent,
        );
      } else {
        // 回退到传统对话模式
        finalResponse = await this.generateTraditionalResponse(
          chatRequestDto.message,
          history,
          agent,
          user,
        );
      }

      // Save assistant message
      const assistantMessage = await this.addMessage(
        conversationId,
        {
          role: MessageRole.ASSISTANT,
          content: finalResponse,
        },
        user,
      );

      // 发射聊天完成事件
      this.eventEmitter.emit('agent.chat.completed', {
        conversationId,
        agentId,
        messageId: assistantMessage.id,
        finalMessage: finalResponse,
        userId: user.id,
        metadata: {
          intentRecognition: intentResult,
          actionResults: executionResults,
        },
      });

      return {
        message: finalResponse,
        conversationId,
        agentId,
        intentRecognition: intentResult,
        actionResults: executionResults,
      };
    } catch (error: any) {
      // 发射错误事件
      this.eventEmitter.emit('agent.error', {
        conversationId,
        agentId,
        error: error.message,
        userId: user.id,
        context: {
          userMessage: chatRequestDto.message,
          errorType: error.constructor.name,
        },
      });

      throw error;
    }
  }

  /**
   * 执行高级意图识别
   */
  private async performIntentRecognition(
    userMessage: string,
    history: ConversationHistory[],
    agent: Agent,
    user: User,
  ): Promise<IntentRecognitionResult> {
    // 获取可用的工具、MCP工具和工作流
    const [tools, mcpTools, workflows] = await Promise.all([
      this.toolService.findAll(user),
      this.mcpService.findAllTools(user),
      this.workflowService.findAll(user),
    ]);

    // 构建意图识别提示词
    const intentPrompt = this.buildIntentRecognitionPrompt(
      userMessage,
      tools,
      mcpTools,
      workflows,
      history,
    );

    // 调用LLM进行意图识别
    const response = await this.llmService.chat({
      model: agent.llmParams?.model || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `你是一个专业的意图识别助手。你需要分析用户输入，识别用户意图，并推荐合适的工具、MCP工具或工作流来满足用户需求。

请以JSON格式返回结果：
{
  "recognizedIntents": [
    {
      "intentId": "意图ID",
      "intentName": "意图名称",
      "confidence": 0.95,
      "reasoning": "识别理由"
    }
  ],
  "primaryIntent": {
    "intentId": "主要意图ID",
    "intentName": "主要意图名称", 
    "confidence": 0.95
  },
  "extractedParameters": {
    "param1": "value1",
    "param2": "value2"
  },
  "needsClarification": false,
  "suggestedActions": [
    {
      "actionType": "tool|mcp_tool|workflow",
      "actionId": "工具/工作流ID",
      "actionName": "动作名称",
      "description": "动作描述",
      "parameters": {}
    }
  ]
}`,
        },
        {
          role: 'user',
          content: intentPrompt,
        },
      ],
      temperature: 0.1,
      maxTokens: 2000,
    });

    try {
      const result = JSON.parse(response.content);
      return result as IntentRecognitionResult;
    } catch (error) {
      // 解析失败时的回退处理
      return {
        recognizedIntents: [],
        primaryIntent: null,
        extractedParameters: {},
        needsClarification: true,
        suggestedActions: [
          {
            actionType: 'clarification',
            description: '无法理解您的意图，请提供更多信息',
          },
        ],
      };
    }
  }

  /**
   * 构建意图识别提示词
   */
  private buildIntentRecognitionPrompt(
    userMessage: string,
    tools: any[],
    mcpTools: any[],
    workflows: any[],
    history: ConversationHistory[],
  ): string {
    const toolsDescription = tools
      .map((tool) => `- 工具: ${tool.name} - ${tool.description}`)
      .join('\n');

    const mcpToolsDescription = mcpTools
      .map((tool) => `- MCP工具: ${tool.name} - ${tool.description}`)
      .join('\n');

    const workflowsDescription = workflows
      .map((workflow) => `- 工作流: ${workflow.name} - ${workflow.description}`)
      .join('\n');

    const recentHistory = history
      .slice(-6)
      .map((h) => `${h.role}: ${h.content}`)
      .join('\n');

    return `用户输入: "${userMessage}"

对话历史:
${recentHistory}

可用的工具:
${toolsDescription}

可用的MCP工具:
${mcpToolsDescription}

可用的工作流:
${workflowsDescription}

请分析用户意图并推荐最合适的工具、MCP工具或工作流来满足用户需求。如果需要更多信息才能确定意图，请设置needsClarification为true。`;
  }

  /**
   * 执行建议的动作
   */
  private async executeSuggestedActions(
    suggestedActions: IntentRecognitionResult['suggestedActions'],
    user: User,
    conversationId: string,
    agentId: string,
  ): Promise<ActionExecutionResult[]> {
    const results: ActionExecutionResult[] = [];

    for (const action of suggestedActions) {
      if (action.actionType === 'clarification') {
        continue; // 跳过澄清动作
      }

      const startTime = Date.now();
      let result: ActionExecutionResult;

      // 发射工具执行开始事件
      this.eventEmitter.emit('agent.tool.execution', {
        conversationId,
        agentId,
        toolId: action.actionId!,
        toolName: action.actionName || action.actionId!,
        toolType: action.actionType,
        status: 'started',
        input: action.parameters,
        timestamp: new Date(),
      });

      try {
        switch (action.actionType) {
          case 'tool':
            const toolResult = await this.toolService.execute(
              action.actionId!,
              action.parameters || {},
              user,
            );
            result = {
              actionType: 'tool',
              actionId: action.actionId!,
              success: true,
              result: toolResult,
              executionTime: Date.now() - startTime,
            };
            break;

          case 'mcp_tool':
            // 解析MCP工具信息 (格式: serverName:toolName)
            const [serverName, toolName] = action.actionId!.split(':');
            const mcpResult = await this.mcpService.executeToolByName(
              serverName,
              toolName,
              action.parameters || {},
              user,
            );
            result = {
              actionType: 'mcp_tool',
              actionId: action.actionId!,
              success: true,
              result: mcpResult,
              executionTime: Date.now() - startTime,
            };
            break;

          case 'workflow':
            const workflowExecution = await this.workflowService.execute(
              action.actionId!,
              {
                input: action.parameters || {},
                triggerType: 'agent_intent',
                triggerData: { agentTriggered: true },
              },
              user,
            );

            // 发射工作流执行事件
            this.eventEmitter.emit('agent.workflow.execution', {
              conversationId,
              agentId,
              workflowId: action.actionId!,
              workflowName: action.actionName || action.actionId!,
              executionId: workflowExecution.id,
              status: workflowExecution.status,
              userId: user.id,
              data: {
                input: action.parameters,
                output: workflowExecution.output,
              },
            });

            result = {
              actionType: 'workflow',
              actionId: action.actionId!,
              success: true,
              result: {
                executionId: workflowExecution.id,
                status: workflowExecution.status,
                output: workflowExecution.output,
              },
              executionTime: Date.now() - startTime,
            };
            break;

          default:
            throw new Error(`Unsupported action type: ${action.actionType}`);
        }

        // 发射工具执行完成事件
        this.eventEmitter.emit('agent.tool.execution', {
          conversationId,
          agentId,
          toolId: action.actionId!,
          toolName: action.actionName || action.actionId!,
          toolType: action.actionType,
          status: 'completed',
          input: action.parameters,
          output: result.result,
          duration: result.executionTime,
          timestamp: new Date(),
        });
      } catch (error: any) {
        result = {
          actionType: action.actionType,
          actionId: action.actionId!,
          success: false,
          error: error.message,
          executionTime: Date.now() - startTime,
        };

        // 发射工具执行失败事件
        this.eventEmitter.emit('agent.tool.execution', {
          conversationId,
          agentId,
          toolId: action.actionId!,
          toolName: action.actionName || action.actionId!,
          toolType: action.actionType,
          status: 'failed',
          input: action.parameters,
          error: error.message,
          duration: result.executionTime,
          timestamp: new Date(),
        });
      }

      results.push(result);
    }

    // 发射动作执行事件
    results.forEach((result) => {
      this.eventEmitter.emit('agent.action.executed', {
        conversationId,
        agentId,
        actionType: result.actionType,
        actionId: result.actionId,
        success: result.success,
        result: result.result,
        error: result.error,
        executionTime: result.executionTime,
        userId: user.id,
      });
    });

    return results;
  }

  /**
   * 生成澄清回复
   */
  private async generateClarificationResponse(
    intentResult: IntentRecognitionResult,
    agent: Agent,
  ): Promise<string> {
    const clarificationAction = intentResult.suggestedActions.find(
      (action) => action.actionType === 'clarification',
    );

    if (clarificationAction?.description) {
      return clarificationAction.description;
    }

    return '抱歉，我需要更多信息来理解您的需求。您能否提供更多详细信息？';
  }

  /**
   * 基于动作执行结果生成回复
   */
  private async generateActionBasedResponse(
    userMessage: string,
    intentResult: IntentRecognitionResult,
    executionResults: ActionExecutionResult[],
    agent: Agent,
  ): Promise<string> {
    const successfulResults = executionResults.filter((r) => r.success);
    const failedResults = executionResults.filter((r) => !r.success);

    let responsePrompt = `用户请求: "${userMessage}"

识别的意图: ${intentResult.primaryIntent?.intentName || '未知'}

执行结果:`;

    if (successfulResults.length > 0) {
      responsePrompt += '\n\n成功执行的动作:';
      successfulResults.forEach((result) => {
        responsePrompt += `\n- ${result.actionType} (${result.actionId}): ${JSON.stringify(result.result)}`;
      });
    }

    if (failedResults.length > 0) {
      responsePrompt += '\n\n执行失败的动作:';
      failedResults.forEach((result) => {
        responsePrompt += `\n- ${result.actionType} (${result.actionId}): ${result.error}`;
      });
    }

    responsePrompt +=
      '\n\n请基于以上执行结果，为用户生成一个友好、有用的回复。';

    const response = await this.llmService.chat({
      model: agent.llmParams?.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `你是 ${agent.name}。${agent.description || ''} 请根据工具执行结果为用户提供有用的回答。`,
        },
        {
          role: 'user',
          content: responsePrompt,
        },
      ],
      temperature: agent.llmParams?.temperature || 0.7,
      maxTokens: agent.llmParams?.maxTokens || 1000,
    });

    return response.content;
  }

  /**
   * 基于知识库增强的对话回复
   */
  private async generateKnowledgeEnhancedResponse(
    userMessage: string,
    history: ConversationHistory[],
    agent: Agent,
    user: User,
  ): Promise<string> {
    // 获取当前角色卡片
    const currentRoleCard = await this.getCurrentRoleCard(agent.id, user);
    
    // 如果有角色卡片且配置了知识库，进行知识库搜索
    let knowledgeContext = '';
    if (currentRoleCard?.enabledKnowledgeBases && currentRoleCard.enabledKnowledgeBases.length > 0) {
      try {
        // 简化的知识库搜索（实际应该调用 SemanticSearchService）
        const recentContext = history.slice(-3).map(h => h.content).join(' ');
        knowledgeContext = await this.searchKnowledgeForContext(
          userMessage,
          currentRoleCard.enabledKnowledgeBases,
          recentContext
        );
      } catch (error) {
        this.logger.warn('Knowledge search failed:', error);
      }
    }

    // 构建增强的系统提示词
    const systemPrompt = this.buildEnhancedSystemPrompt(agent, currentRoleCard, knowledgeContext);

    // 准备对话消息
    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt,
      },
      ...history.slice(-10).map((h) => ({
        role: h.role.toLowerCase() as 'user' | 'assistant' | 'system',
        content: h.content,
      })),
    ];

    // 调用LLM
    const response = await this.llmService.chat({
      model: currentRoleCard?.llmParams?.model || agent.llmParams?.model || 'gpt-3.5-turbo',
      messages,
      temperature: currentRoleCard?.llmParams?.temperature || agent.llmParams?.temperature || 0.7,
      maxTokens: currentRoleCard?.llmParams?.maxTokens || agent.llmParams?.maxTokens || 1000,
    });

    return response.content;
  }

  /**
   * 生成传统对话回复（回退模式）
   */
  private async generateTraditionalResponse(
    userMessage: string,
    history: ConversationHistory[],
    agent: Agent,
    user: User,
  ): Promise<string> {
    // 获取可用工具并生成工具提示
    const tools = await this.toolService.getToolsForLLM(user);
    const toolPrompt = await this.toolService.generateToolPrompt(user);

    // 准备对话消息
    const messages = [
      {
        role: 'system' as const,
        content: `你是 ${agent.name}。${agent.description || ''}
        
${toolPrompt}

请根据用户的问题判断是否需要使用工具。如果需要使用工具，请按照指定的JSON格式回复。如果不需要使用工具，请直接回答用户的问题。`,
      },
      ...history.map((h) => ({
        role: h.role.toLowerCase() as 'user' | 'assistant' | 'system',
        content: h.content,
      })),
    ];

    // 调用LLM
    const response = await this.llmService.chat({
      model: agent.llmParams?.model || 'gpt-3.5-turbo',
      messages,
      temperature: agent.llmParams?.temperature || 0.7,
      maxTokens: agent.llmParams?.maxTokens || 1000,
    });

    let finalResponse = response.content;

    // 检查是否包含工具调用
    try {
      const toolCall = JSON.parse(response.content);
      if (
        toolCall.action === 'use_tool' &&
        toolCall.tool_name &&
        toolCall.parameters
      ) {
        // 查找工具
        const tool = await this.toolService.findAll(user);
        const targetTool = tool.find((t) => t.name === toolCall.tool_name);

        if (targetTool) {
          // 执行工具
          const toolResult = await this.toolService.execute(
            targetTool.id,
            toolCall.parameters,
            user,
          );

          // 生成基于工具结果的回复
          const followUpResponse = await this.llmService.chat({
            model: agent.llmParams?.model || 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system' as const,
                content: `你是 ${agent.name}。请根据工具执行的结果为用户提供有用的回答。`,
              },
              {
                role: 'user' as const,
                content: userMessage,
              },
              {
                role: 'assistant' as const,
                content: `我使用了工具 "${toolCall.tool_name}" 来处理你的请求，结果如下：\n${JSON.stringify(toolResult, null, 2)}`,
              },
              {
                role: 'user' as const,
                content: '请根据这个结果为我提供一个清晰易懂的回答。',
              },
            ],
            temperature: agent.llmParams?.temperature || 0.7,
            maxTokens: agent.llmParams?.maxTokens || 1000,
          });

          finalResponse = followUpResponse.content;
        } else {
          finalResponse = `抱歉，我找不到名为 "${toolCall.tool_name}" 的工具。`;
        }
      }
    } catch (error) {
      // 如果解析失败，将其视为正常回复
      // finalResponse 已经设置为 response.content
    }

    return finalResponse;
  }

  async streamChat(
    agentId: string,
    conversationId: string,
    chatRequestDto: ChatRequestDto,
    user: User,
  ): Promise<Observable<{ content: string; done: boolean }>> {
    const agent = await this.agentRepo.findOne({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${agentId} not found`);
    }

    if (!agent.llmParams?.model) {
      throw new NotFoundException(
        `Agent ${agentId} has no LLM model configured`,
      );
    }

    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: ['agent'],
    });

    if (!conversation) {
      throw new NotFoundException(
        `Conversation with ID ${conversationId} not found`,
      );
    }

    if (conversation.agent.id !== agentId) {
      throw new NotFoundException(
        `Conversation does not belong to agent ${agentId}`,
      );
    }

    // Save user message
    const userMessage = this.historyRepo.create({
      conversation,
      role: MessageRole.USER,
      content: chatRequestDto.message,
    });
    await this.historyRepo.save(userMessage);

    // Get conversation history
    const history = await this.historyRepo.find({
      where: { conversation: { id: conversationId } },
      order: { createdAt: 'ASC' },
    });

    // Prepare messages for LLM
    const messages = history.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Get streaming response from LLM
    const stream = await this.llmService.streamChat(agent.llmParams.model, {
      messages,
      temperature: agent.llmParams.temperature ?? 0.7,
      maxTokens: agent.llmParams.maxTokens ?? 2000,
    });

    return stream;
  }

  async findMyAgents(
    user: User,
    options: { page: number; pageSize: number; name?: string },
  ) {
    const { page, pageSize, name } = options;
    const queryBuilder = this.agentRepo
      .createQueryBuilder('agent')
      .where('agent.userId = :userId', { userId: user.id });

    if (name) {
      queryBuilder.andWhere('agent.name LIKE :name', { name: `%${name}%` });
    }

    const [items, total] = await queryBuilder
      .orderBy('agent.isDefault', 'DESC')
      .addOrderBy('agent.updatedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async findPublicAgents(
    user: User,
    options: { page: number; pageSize: number; name?: string },
  ) {
    const { page, pageSize, name } = options;
    const queryBuilder = this.agentRepo
      .createQueryBuilder('agent')
      .where('agent.isPublic = :isPublic', { isPublic: true });

    if (name) {
      queryBuilder.andWhere('agent.name LIKE :name', { name: `%${name}%` });
    }

    const [items, total] = await queryBuilder
      .orderBy('agent.isDefault', 'DESC')
      .addOrderBy('agent.updatedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  // 切换角色
  async switchRole(agentId: string, roleId: string, user: User): Promise<Agent> {
    const agent = await this.findOne(agentId, user);
    const role = agent.longTermMemory?.roles.find(r => r.id === roleId);
    if (!role) throw new Error('Role not found');
    if (!agent.shortTermMemory) agent.shortTermMemory = { context: '', lastInteraction: new Date() };
    agent.shortTermMemory.activeRole = role.name;
    agent.shortTermMemory.activePrompt = role.prompt;
    return this.agentRepo.save(agent);
  }

  // 更新环境上下文
  async updateEnvironmentContext(agentId: string, context: any, user: User): Promise<Agent> {
    const agent = await this.findOne(agentId, user);
    if (!agent.environmentContext) agent.environmentContext = { collaborators: [], sharedContext: {} };
    agent.environmentContext = { ...agent.environmentContext, ...context };
    return this.agentRepo.save(agent);
  }

  // 同步协作 agent 的上下文
  async syncCollaboratorContext(agentId: string, collaboratorId: string, user: User): Promise<Agent> {
    const agent = await this.findOne(agentId, user);
    const collaborator = await this.findOne(collaboratorId, user);
    if (!agent.environmentContext) agent.environmentContext = { collaborators: [], sharedContext: {} };
    if (!agent.environmentContext.collaborators) agent.environmentContext.collaborators = [];
    agent.environmentContext.collaborators = agent.environmentContext.collaborators.map(c => 
      c.agentId === collaboratorId ? { ...c, lastSync: new Date() } : c
    );
    return this.agentRepo.save(agent);
  }

  // ==================== RoleCard 相关方法 ====================

  // 创建角色卡片
  async createRoleCard(createRoleCardDto: CreateRoleCardDto, user: User): Promise<RoleCard> {
    const roleCard = this.roleCardRepo.create({
      ...createRoleCardDto,
      user,
    });
    return this.roleCardRepo.save(roleCard);
  }

  // 获取我的角色卡片列表
  async findMyRoleCards(
    user: User,
    options: { page: number; pageSize: number; name?: string },
  ) {
    const { page, pageSize, name } = options;
    const queryBuilder = this.roleCardRepo
      .createQueryBuilder('roleCard')
      .where('roleCard.userId = :userId', { userId: user.id });

    if (name) {
      queryBuilder.andWhere('roleCard.name LIKE :name', { name: `%${name}%` });
    }

    const [items, total] = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  // 获取公开的角色卡片列表
  async findPublicRoleCards(
    user: User,
    options: { page: number; pageSize: number; name?: string },
  ) {
    const { page, pageSize, name } = options;
    const queryBuilder = this.roleCardRepo
      .createQueryBuilder('roleCard')
      .where('roleCard.isPublic = :isPublic', { isPublic: true });

    if (name) {
      queryBuilder.andWhere('roleCard.name LIKE :name', { name: `%${name}%` });
    }

    const [items, total] = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  // 获取指定角色卡片
  async findOneRoleCard(id: string, user: User): Promise<RoleCard> {
    const roleCard = await this.roleCardRepo.findOne({
      where: [
        { id, user: { id: user.id } }, // 用户自己的角色卡片
        { id, isPublic: true }, // 公开的角色卡片
      ],
      relations: ['user'],
    });

    if (!roleCard) {
      throw new NotFoundException(`RoleCard with ID ${id} not found`);
    }

    return roleCard;
  }

  // 更新角色卡片
  async updateRoleCard(
    id: string,
    updateRoleCardDto: UpdateRoleCardDto,
    user: User,
  ): Promise<RoleCard> {
    const roleCard = await this.roleCardRepo.findOne({
      where: { id, user: { id: user.id } },
    });

    if (!roleCard) {
      throw new NotFoundException(`RoleCard with ID ${id} not found`);
    }

    Object.assign(roleCard, updateRoleCardDto);
    return this.roleCardRepo.save(roleCard);
  }

  // 删除角色卡片
  async removeRoleCard(id: string, user: User): Promise<void> {
    const roleCard = await this.roleCardRepo.findOne({
      where: { id, user: { id: user.id } },
    });

    if (!roleCard) {
      throw new NotFoundException(`RoleCard with ID ${id} not found`);
    }

    await this.roleCardRepo.remove(roleCard);
  }

  // 为 Agent 添加角色卡片
  async addRoleCardToAgent(agentId: string, roleCardId: string, user: User): Promise<Agent> {
    const agent = await this.findOne(agentId, user);
    const roleCard = await this.findOneRoleCard(roleCardId, user);

    if (!agent.roleCards) {
      agent.roleCards = [];
    }

    // 检查是否已经添加过
    const exists = agent.roleCards.some(rc => rc.id === roleCardId);
    if (!exists) {
      agent.roleCards.push(roleCard);
      await this.agentRepo.save(agent);
    }

    return agent;
  }

  // 从 Agent 移除角色卡片
  async removeRoleCardFromAgent(agentId: string, roleCardId: string, user: User): Promise<Agent> {
    const agent = await this.agentRepo.findOne({
      where: { id: agentId, user: { id: user.id } },
      relations: ['roleCards'],
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${agentId} not found`);
    }

    agent.roleCards = agent.roleCards.filter(rc => rc.id !== roleCardId);
    
    // 如果移除的是当前激活的角色卡片，清除激活状态
    if (agent.currentRoleCardId === roleCardId) {
      agent.currentRoleCardId = undefined;
    }

    return this.agentRepo.save(agent);
  }

  // 切换 Agent 的角色卡片
  async switchAgentRoleCard(agentId: string, roleCardId: string, user: User): Promise<Agent> {
    const agent = await this.agentRepo.findOne({
      where: { id: agentId, user: { id: user.id } },
      relations: ['roleCards'],
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${agentId} not found`);
    }

    const roleCard = agent.roleCards.find(rc => rc.id === roleCardId);
    if (!roleCard) {
      throw new NotFoundException(`RoleCard with ID ${roleCardId} not found in agent's role cards`);
    }

    // 更新当前激活的角色卡片
    agent.currentRoleCardId = roleCardId;

    // 根据角色卡片配置更新 agent 的相关设置
    if (roleCard.llmParams) {
      agent.llmParams = { ...agent.llmParams, ...roleCard.llmParams };
    }

    if (roleCard.intentRecognitionConfig) {
      agent.intentRecognition = roleCard.intentRecognitionConfig as any;
    }

    if (roleCard.enabledTools) {
      agent.enabledTools = roleCard.enabledTools;
    }

    if (roleCard.enabledMcpTools) {
      agent.enabledMcpTools = roleCard.enabledMcpTools;
    }

    if (roleCard.enabledWorkflows) {
      agent.enabledWorkflows = roleCard.enabledWorkflows;
    }

    // 更新短期记忆
    if (!agent.shortTermMemory) {
      agent.shortTermMemory = { context: '', lastInteraction: new Date() };
    }
    agent.shortTermMemory.activeRole = roleCard.name;
    agent.shortTermMemory.activePrompt = roleCard.systemPrompt;

    return this.agentRepo.save(agent);
  }

  // 获取 Agent 的当前角色卡片
  async getCurrentRoleCard(agentId: string, user: User): Promise<RoleCard> {
    const agent = await this.findOne(agentId, user);
    if (!agent.currentRoleCardId) {
      throw new NotFoundException('No current role card found for this agent');
    }
    const roleCard = await this.roleCardRepo.findOne({ where: { id: agent.currentRoleCardId } });
    if (!roleCard) {
      throw new NotFoundException('Role card not found');
    }
    return roleCard;
  }

  // 根据角色卡片配置生成聊天回复
  async chatWithRoleCard(
    agentId: string,
    conversationId: string,
    chatRequestDto: ChatRequestDto,
    user: User,
  ): Promise<any> {
    const agent = await this.findOne(agentId, user);
    const currentRoleCard = await this.getCurrentRoleCard(agentId, user);

    if (!currentRoleCard) {
      // 如果没有激活的角色卡片，使用默认的聊天逻辑
      return this.chat(agentId, conversationId, chatRequestDto, user);
    }

    const conversation = await this.findOneConversation(conversationId, user);

    if (conversation.agent.id !== agentId) {
      throw new NotFoundException('Conversation does not belong to this agent');
    }

    // 保存用户消息
    await this.addMessage(
      conversationId,
      {
        role: MessageRole.USER,
        content: chatRequestDto.message,
      },
      user,
    );

    // 获取对话历史
    const history = await this.getConversationHistory(conversationId, user);

    // 使用角色卡片的配置进行对话
    const messages = [
      {
        role: 'system' as const,
        content: currentRoleCard.systemPrompt,
      },
      ...history.map((h) => ({
        role: h.role.toLowerCase() as 'user' | 'assistant' | 'system',
        content: h.content,
      })),
    ];

    // 使用角色卡片的 LLM 参数
    const llmParams = currentRoleCard.llmParams || agent.llmParams;
    const response = await this.llmService.chat({
      model: llmParams?.model || 'gpt-3.5-turbo',
      messages,
      temperature: llmParams?.temperature || 0.7,
      maxTokens: llmParams?.maxTokens || 1000,
    });

    // 保存助手回复
    const assistantMessage = await this.addMessage(
      conversationId,
      {
        role: MessageRole.ASSISTANT,
        content: response.content,
      },
      user,
    );

    return {
      message: response.content,
      conversationId,
      agentId,
      roleCard: {
        id: currentRoleCard.id,
        name: currentRoleCard.name,
      },
    };
  }

  // 知识库搜索相关的辅助方法
  private async searchKnowledgeForContext(
    query: string,
    knowledgebaseIds: string[],
    context: string
  ): Promise<string> {
    // TODO: 实现知识库搜索
    // 这里应该调用 SemanticSearchService
    return `基于知识库搜索的上下文信息：${query}`;
  }

  private buildEnhancedSystemPrompt(
    agent: Agent,
    roleCard: RoleCard | null,
    knowledgeContext: string
  ): string {
    let systemPrompt = agent.description || `你是 ${agent.name}`;

    if (roleCard) {
      systemPrompt = roleCard.systemPrompt || systemPrompt;
    }

    if (knowledgeContext) {
      systemPrompt += `\n\n相关知识库信息：\n${knowledgeContext}`;
    }

    return systemPrompt;
  }

  async setDefaultAgent(agentId: string, user: User): Promise<boolean> {
    // 首先将该用户的所有Agent设置为非默认
    await this.agentRepo.update(
      { user: { id: user.id } },
      { isDefault: false }
    );

    // 然后将指定的Agent设置为默认
    const result = await this.agentRepo.update(
      { id: agentId, user: { id: user.id } },
      { isDefault: true }
    );

    return (result.affected ?? 0) > 0;
  }

  async getDefaultAgent(user: User): Promise<Agent> {
    // 首先尝试获取用户设置的默认Agent
    const defaultAgent = await this.agentRepo.findOne({
      where: { user: { id: user.id }, isDefault: true },
      order: { updatedAt: 'DESC' }
    });

    if (defaultAgent) {
      return defaultAgent;
    }

    // 如果没有设置默认Agent，尝试获取用户最近使用的agent
    const recentAgent = await this.agentRepo.findOne({
      where: { user: { id: user.id } },
      order: { updatedAt: 'DESC' }
    });

    if (recentAgent) {
      return recentAgent;
    }

    // 如果没有最近使用的agent，尝试获取一个公开的agent
    const publicAgent = await this.agentRepo.findOne({
      where: { isPublic: true },
      order: { createdAt: 'DESC' }
    });

    if (publicAgent) {
      return publicAgent;
    }

    // 如果都没有，创建一个新的默认agent
    const newDefaultAgent = this.agentRepo.create({
      name: '默认助手',
      description: '这是一个默认的AI助手',
      user: user,
      isPublic: false,
      isDefault: true,
      llmParams: {
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 2000
      }
    });

    return this.agentRepo.save(newDefaultAgent);
  }
}
