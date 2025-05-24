import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from './entities/agent.entity';
import { Conversation } from './entities/conversation.entity';
import { ConversationHistory, MessageRole } from './entities/conversation-history.entity';
import { CreateAgentDto, UpdateAgentDto } from './dto/agent.dto';
import { CreateConversationDto, UpdateConversationDto, CreateMessageDto } from './dto/conversation.dto';
import { ChatRequestDto } from './dto/chat.dto';
import { User } from '../user/user.entity';
import { LlmService } from '../llm/llm.service';
import { ToolService } from '../tool/tool.service';
import { Observable } from 'rxjs';

@Injectable()
export class AgentService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(ConversationHistory)
    private readonly historyRepo: Repository<ConversationHistory>,
    private readonly llmService: LlmService,
    private readonly toolService: ToolService,
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

  async update(id: string, updateAgentDto: UpdateAgentDto, user: User): Promise<Agent> {
    const agent = await this.findOne(id, user);
    Object.assign(agent, updateAgentDto);
    return this.agentRepo.save(agent);
  }

  async remove(id: string, user: User): Promise<void> {
    const agent = await this.findOne(id, user);
    await this.agentRepo.remove(agent);
  }

  async createConversation(createConversationDto: CreateConversationDto, user: User): Promise<Conversation> {
    const agent = await this.findOne(createConversationDto.agentId, user);
    const conversation = this.conversationRepo.create({
      name: createConversationDto.name,
      user,
      agent,
    });
    return this.conversationRepo.save(conversation);
  }

  async findAllConversations(agentId: string, user: User): Promise<Conversation[]> {
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

  async updateConversation(id: string, updateConversationDto: UpdateConversationDto, user: User): Promise<Conversation> {
    const conversation = await this.findOneConversation(id, user);
    Object.assign(conversation, updateConversationDto);
    return this.conversationRepo.save(conversation);
  }

  async removeConversation(id: string, user: User): Promise<void> {
    const conversation = await this.findOneConversation(id, user);
    await this.conversationRepo.remove(conversation);
  }

  async addMessage(conversationId: string, createMessageDto: CreateMessageDto, user: User): Promise<ConversationHistory> {
    const conversation = await this.findOneConversation(conversationId, user);
    const message = this.historyRepo.create({
      ...createMessageDto,
      conversation,
    });
    return this.historyRepo.save(message);
  }

  async getConversationHistory(conversationId: string, user: User): Promise<ConversationHistory[]> {
    const conversation = await this.findOneConversation(conversationId, user);
    return this.historyRepo.find({
      where: { conversation: { id: conversation.id } },
      order: { createdAt: 'ASC' },
    });
  }

  async chat(agentId: string, conversationId: string, chatRequestDto: ChatRequestDto, user: User): Promise<any> {
    const agent = await this.findOne(agentId, user);
    const conversation = await this.findOneConversation(conversationId, user);
    
    if (conversation.agent.id !== agentId) {
      throw new NotFoundException('Conversation does not belong to this agent');
    }

    // Save user message
    await this.addMessage(conversationId, {
      role: MessageRole.USER,
      content: chatRequestDto.message
    }, user);

    // Get conversation history
    const history = await this.getConversationHistory(conversationId, user);
    
    // Get available tools for this user
    const tools = await this.toolService.getToolsForLLM(user);
    const toolPrompt = await this.toolService.generateToolPrompt(user);
    
    // Prepare messages for LLM
    const messages = [
      {
        role: 'system' as const,
        content: `你是 ${agent.name}。${agent.description || ''}
        
${toolPrompt}

请根据用户的问题判断是否需要使用工具。如果需要使用工具，请按照指定的JSON格式回复。如果不需要使用工具，请直接回答用户的问题。`
      },
      ...history.map(h => ({
        role: h.role.toLowerCase() as 'user' | 'assistant' | 'system',
        content: h.content
      }))
    ];

    // Call LLM
    const response = await this.llmService.chat({
      model: agent.llmParams?.model || 'gpt-3.5-turbo',
      messages,
      temperature: agent.llmParams?.temperature || 0.7,
      maxTokens: agent.llmParams?.maxTokens || 1000,
    });

    let finalResponse = response.content;
    
    // Check if the response contains tool usage
    try {
      const toolCall = JSON.parse(response.content);
      if (toolCall.action === 'use_tool' && toolCall.tool_name && toolCall.parameters) {
        // Find the tool by name
        const tool = await this.toolService.findAll(user);
        const targetTool = tool.find(t => t.name === toolCall.tool_name);
        
        if (targetTool) {
          // Execute the tool
          const toolResult = await this.toolService.execute(targetTool.id, toolCall.parameters, user);
          
          // Generate a response based on the tool result
          const followUpResponse = await this.llmService.chat({
            model: agent.llmParams?.model || 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system' as const,
                content: `你是 ${agent.name}。请根据工具执行的结果为用户提供有用的回答。`
              },
              {
                role: 'user' as const,
                content: chatRequestDto.message
              },
              {
                role: 'assistant' as const,
                content: `我使用了工具 "${toolCall.tool_name}" 来处理你的请求，结果如下：\n${JSON.stringify(toolResult, null, 2)}`
              },
              {
                role: 'user' as const,
                content: '请根据这个结果为我提供一个清晰易懂的回答。'
              }
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
      // If parsing fails, treat as normal response
      // finalResponse is already set to response.content
    }

    // Save assistant message
    await this.addMessage(conversationId, {
      role: MessageRole.ASSISTANT,
      content: finalResponse
    }, user);

    return {
      message: finalResponse,
      conversationId,
      agentId
    };
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
      throw new NotFoundException(`Agent ${agentId} has no LLM model configured`);
    }

    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: ['agent'],
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${conversationId} not found`);
    }

    if (conversation.agent.id !== agentId) {
      throw new NotFoundException(`Conversation does not belong to agent ${agentId}`);
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
    const messages = history.map(msg => ({
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
} 