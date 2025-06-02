import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Sse,
  Request,
  Req,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AgentService } from './agent.service';
import {
  CreateAgentDto,
  UpdateAgentDto,
  TestIntentRecognitionDto,
} from './dto/agent.dto';
import { CreateRoleCardDto, UpdateRoleCardDto } from './dto/role-card.dto';
import {
  CreateConversationDto,
  UpdateConversationDto,
  CreateMessageDto,
} from './dto/conversation.dto';
import { ChatRequestDto } from './dto/chat.dto';
import { Agent } from './entities/agent.entity';
import { RoleCard } from './entities/role-card.entity';
import { Conversation } from './entities/conversation.entity';
import { ConversationHistory } from './entities/conversation-history.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User as UserDecorator } from '../decorators/user.decorator';
import { User } from '../user/user.entity';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MessageRole } from './entities/conversation-history.entity';
import { LlmService } from '../llm/llm.service';

@ApiTags('agents')
@Controller('agent')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly llmService: LlmService,
  ) {}

  @Get('my')
  @ApiOperation({ summary: '获取我的 Agent 列表' })
  @ApiResponse({ type: [Agent] })
  async findMyAgents(
    @UserDecorator() user: User,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 12,
    @Query('name') name?: string,
  ) {
    const result = await this.agentService.findMyAgents(user, { page, pageSize, name });
    const items = await Promise.all(result.items.map(async agent => {
      if (!agent.modelId) return { ...agent, modelName: 'Unknown', providerId: undefined, providerName: 'Unknown', isPublic: agent.isPublic };
      const model = await this.llmService.findOne(agent.modelId);
      return {
        ...agent,
        modelName: model?.name || 'Unknown',
        providerId: model?.provider?.id,
        providerName: model?.provider?.name || 'Unknown',
        isPublic: agent.isPublic
      };
    }));
    return { ...result, items };
  }

  @Get('public')
  @ApiOperation({ summary: '获取公开的 Agent 列表' })
  @ApiResponse({ type: [Agent] })
  findPublicAgents(
    @UserDecorator() user: User,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 12,
    @Query('name') name?: string,
  ) {
    return this.agentService.findPublicAgents(user, { page, pageSize, name });
  }

  @Post()
  @ApiOperation({ summary: '创建 Agent' })
  @ApiResponse({ type: Agent })
  create(@Body() createAgentDto: CreateAgentDto, @UserDecorator() user: User) {
    return this.agentService.create(createAgentDto, user);
  }

  @Get()
  @ApiOperation({ summary: '获取所有 Agent' })
  @ApiResponse({ type: [Agent] })
  findAll(@UserDecorator() user: User) {
    return this.agentService.findAll(user);
  }

  @Get('default')
  @ApiOperation({ summary: '获取默认 Agent' })
  @ApiResponse({ type: Agent })
  async getDefaultAgent(@UserDecorator() user: User) {
    const agent = await this.agentService.getDefaultAgent(user);
    if (!agent.modelId) return { ...agent, modelName: 'Unknown', providerId: undefined, providerName: 'Unknown', isPublic: agent.isPublic };
    const model = await this.llmService.findOne(agent.modelId);
    return {
      ...agent,
      modelName: model?.name || 'Unknown',
      providerId: model?.provider?.id,
      providerName: model?.provider?.name || 'Unknown',
      isPublic: agent.isPublic
    };
  }

  @Get(':id')
  @ApiOperation({ summary: '获取指定 Agent' })
  @ApiResponse({ type: Agent })
  async findOne(@Param('id') id: string, @UserDecorator() user: User) {
    const agent = await this.agentService.findOne(id, user);
    if (!agent.modelId) return { ...agent, modelName: 'Unknown', providerId: undefined, providerName: 'Unknown', isPublic: agent.isPublic };
    const model = await this.llmService.findOne(agent.modelId);
    return {
      ...agent,
      modelName: model?.name || 'Unknown',
      providerId: model?.provider?.id,
      providerName: model?.provider?.name || 'Unknown',
      isPublic: agent.isPublic
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新 Agent' })
  @ApiResponse({ type: Agent })
  update(
    @Param('id') id: string,
    @Body() updateAgentDto: UpdateAgentDto,
    @UserDecorator() user: User,
  ) {
    return this.agentService.update(id, updateAgentDto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除 Agent' })
  @ApiResponse({ description: '删除成功' })
  remove(@Param('id') id: string, @UserDecorator() user: User) {
    return this.agentService.remove(id, user);
  }

  @Post(':agentId/conversations')
  @ApiOperation({ summary: '创建会话' })
  @ApiResponse({ type: Conversation })
  createConversation(
    @Param('agentId') agentId: string,
    @Body() createConversationDto: CreateConversationDto,
    @UserDecorator() user: User,
  ) {
    return this.agentService.createConversation(createConversationDto, user);
  }

  @Get(':agentId/conversations')
  @ApiOperation({ summary: '获取 Agent 的所有会话' })
  @ApiResponse({ type: [Conversation] })
  findAllConversations(
    @Param('agentId') agentId: string,
    @UserDecorator() user: User,
  ) {
    return this.agentService.findAllConversations(agentId, user);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: '获取指定会话' })
  @ApiResponse({ type: Conversation })
  findOneConversation(@Param('id') id: string, @UserDecorator() user: User) {
    return this.agentService.findOneConversation(id, user);
  }

  @Patch('conversations/:id')
  @ApiOperation({ summary: '更新会话' })
  @ApiResponse({ type: Conversation })
  updateConversation(
    @Param('id') id: string,
    @Body() updateConversationDto: UpdateConversationDto,
    @UserDecorator() user: User,
  ) {
    return this.agentService.updateConversation(
      id,
      updateConversationDto,
      user,
    );
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: '删除会话' })
  @ApiResponse({ description: '删除成功' })
  removeConversation(@Param('id') id: string, @UserDecorator() user: User) {
    return this.agentService.removeConversation(id, user);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: '添加消息' })
  @ApiResponse({ type: ConversationHistory })
  addMessage(
    @Param('id') id: string,
    @Body() createMessageDto: CreateMessageDto,
    @UserDecorator() user: User,
  ) {
    return this.agentService.addMessage(id, createMessageDto, user);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: '获取会话历史' })
  @ApiResponse({ type: [ConversationHistory] })
  getConversationHistory(@Param('id') id: string, @UserDecorator() user: User) {
    return this.agentService.getConversationHistory(id, user);
  }

  @Post(':agentId/conversations/:conversationId/chat')
  @ApiOperation({ summary: '与 Agent 进行对话' })
  @ApiResponse({ type: ConversationHistory })
  chat(
    @Param('agentId') agentId: string,
    @Param('conversationId') conversationId: string,
    @Body() chatRequestDto: ChatRequestDto,
    @UserDecorator() user: User,
  ) {
    return this.agentService.chat(
      agentId,
      conversationId,
      chatRequestDto,
      user,
    );
  }

  @Post(':agentId/conversations/:conversationId/stream-chat')
  @ApiOperation({ summary: '与 Agent 进行流式对话' })
  @ApiResponse({ type: [ConversationHistory] })
  @Sse()
  async streamChat(
    @Param('agentId') agentId: string,
    @Param('conversationId') conversationId: string,
    @Body() chatRequestDto: ChatRequestDto,
    @UserDecorator() user: User,
  ): Promise<Observable<MessageEvent>> {
    const stream = await this.agentService.streamChat(
      agentId,
      conversationId,
      chatRequestDto,
      user,
    );
    return stream.pipe(
      map((data) => {
        const event = new MessageEvent('message', {
          data: JSON.stringify(data),
          lastEventId: Date.now().toString(),
          origin: '*',
        });
        return event;
      }),
    );
  }

  @Post(':id/test-intent-recognition')
  @ApiOperation({ summary: 'Test intent recognition for an agent' })
  @ApiResponse({ status: 200, description: 'Intent recognition result' })
  async testIntentRecognition(
    @Param('id') id: string,
    @Body() testDto: TestIntentRecognitionDto,
    @Request() req,
  ) {
    const user = req.user;
    const agent = await this.agentService.findOne(id, user);

    // 模拟对话历史
    const mockHistory =
      testDto.conversationHistory?.map((h) => ({
        role: h.role === 'user' ? MessageRole.USER : MessageRole.ASSISTANT,
        content: h.content,
        createdAt: new Date(),
      })) || [];

    const startTime = Date.now();

    // 调用意图识别方法
    const result = await this.agentService['performIntentRecognition'](
      testDto.message,
      mockHistory as any,
      agent,
      user,
    );

    return {
      ...result,
      processingTime: Date.now() - startTime,
      modelUsed: agent.llmParams?.model || 'gpt-3.5-turbo',
      agentId: id,
      agentName: agent.name,
    };
  }

  @Post(':id/conversations/:conversationId/websocket-chat')
  @ApiOperation({ summary: '通过 WebSocket 与 Agent 进行实时聊天' })
  @ApiParam({ name: 'id', description: 'Agent ID' })
  @ApiParam({ name: 'conversationId', description: '对话 ID' })
  @ApiBody({ type: ChatRequestDto })
  async websocketChat(
    @Param('id') id: string,
    @Param('conversationId') conversationId: string,
    @Body() chatRequestDto: ChatRequestDto,
    @Req() req: any,
  ) {
    const user = req.user;

    // 执行聊天逻辑（这会自动触发WebSocket事件）
    const result = await this.agentService.chat(
      id,
      conversationId,
      chatRequestDto,
      user,
    );

    return {
      success: true,
      message: 'Chat initiated, check WebSocket for real-time updates',
      data: result,
      websocketNamespace: '/agent-realtime',
      events: [
        'chat-started',
        'intent-recognized',
        'tool-execution',
        'workflow-execution',
        'chat-completed',
        'agent-error',
      ],
    };
  }

  @Post('role-cards')
  @ApiOperation({ summary: '创建角色卡片' })
  @ApiResponse({ type: RoleCard })
  createRoleCard(@Body() createRoleCardDto: CreateRoleCardDto, @UserDecorator() user: User) {
    return this.agentService.createRoleCard(createRoleCardDto, user);
  }

  @Get('role-cards/my')
  @ApiOperation({ summary: '获取我的角色卡片列表' })
  @ApiResponse({ type: [RoleCard] })
  findMyRoleCards(
    @UserDecorator() user: User,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 12,
    @Query('name') name?: string,
  ) {
    return this.agentService.findMyRoleCards(user, { page, pageSize, name });
  }

  @Get('role-cards/public')
  @ApiOperation({ summary: '获取公开的角色卡片列表' })
  @ApiResponse({ type: [RoleCard] })
  findPublicRoleCards(
    @UserDecorator() user: User,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 12,
    @Query('name') name?: string,
  ) {
    return this.agentService.findPublicRoleCards(user, { page, pageSize, name });
  }

  @Get('role-cards/:id')
  @ApiOperation({ summary: '获取指定角色卡片' })
  @ApiResponse({ type: RoleCard })
  findOneRoleCard(@Param('id') id: string, @UserDecorator() user: User) {
    return this.agentService.findOneRoleCard(id, user);
  }

  @Patch('role-cards/:id')
  @ApiOperation({ summary: '更新角色卡片' })
  @ApiResponse({ type: RoleCard })
  updateRoleCard(
    @Param('id') id: string,
    @Body() updateRoleCardDto: UpdateRoleCardDto,
    @UserDecorator() user: User,
  ) {
    return this.agentService.updateRoleCard(id, updateRoleCardDto, user);
  }

  @Delete('role-cards/:id')
  @ApiOperation({ summary: '删除角色卡片' })
  @ApiResponse({ description: '删除成功' })
  removeRoleCard(@Param('id') id: string, @UserDecorator() user: User) {
    return this.agentService.removeRoleCard(id, user);
  }

  @Post(':agentId/role-cards/:roleCardId')
  @ApiOperation({ summary: '为 Agent 添加角色卡片' })
  @ApiResponse({ type: Agent })
  addRoleCardToAgent(
    @Param('agentId') agentId: string,
    @Param('roleCardId') roleCardId: string,
    @UserDecorator() user: User,
  ) {
    return this.agentService.addRoleCardToAgent(agentId, roleCardId, user);
  }

  @Delete(':agentId/role-cards/:roleCardId')
  @ApiOperation({ summary: '从 Agent 移除角色卡片' })
  @ApiResponse({ type: Agent })
  removeRoleCardFromAgent(
    @Param('agentId') agentId: string,
    @Param('roleCardId') roleCardId: string,
    @UserDecorator() user: User,
  ) {
    return this.agentService.removeRoleCardFromAgent(agentId, roleCardId, user);
  }

  @Post(':agentId/switch-role-card/:roleCardId')
  @ApiOperation({ summary: '切换 Agent 的角色卡片' })
  @ApiResponse({ type: Agent })
  switchAgentRoleCard(
    @Param('agentId') agentId: string,
    @Param('roleCardId') roleCardId: string,
    @UserDecorator() user: User,
  ) {
    return this.agentService.switchAgentRoleCard(agentId, roleCardId, user);
  }

  @Get(':agentId/current-role-card')
  @ApiOperation({ summary: '获取 Agent 的当前角色卡片' })
  @ApiResponse({ type: RoleCard })
  getCurrentRoleCard(@Param('agentId') agentId: string, @UserDecorator() user: User) {
    return this.agentService.getCurrentRoleCard(agentId, user);
  }

  @Post(':agentId/conversations/:conversationId/chat-with-role')
  @ApiOperation({ summary: '使用角色卡片与 Agent 对话' })
  @ApiResponse({ type: ConversationHistory })
  chatWithRoleCard(
    @Param('agentId') agentId: string,
    @Param('conversationId') conversationId: string,
    @Body() chatRequestDto: ChatRequestDto,
    @UserDecorator() user: User,
  ) {
    return this.agentService.chatWithRoleCard(agentId, conversationId, chatRequestDto, user);
  }
}
