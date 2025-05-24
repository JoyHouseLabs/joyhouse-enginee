import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Sse } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AgentService } from './agent.service';
import { CreateAgentDto, UpdateAgentDto } from './dto/agent.dto';
import { CreateConversationDto, UpdateConversationDto, CreateMessageDto } from './dto/conversation.dto';
import { ChatRequestDto } from './dto/chat.dto';
import { Agent } from './entities/agent.entity';
import { Conversation } from './entities/conversation.entity';
import { ConversationHistory } from './entities/conversation-history.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User as UserDecorator } from '../decorators/user.decorator';
import { User } from '../user/user.entity';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@ApiTags('agents')
@Controller('agents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

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

  @Get(':id')
  @ApiOperation({ summary: '获取指定 Agent' })
  @ApiResponse({ type: Agent })
  findOne(@Param('id') id: string, @UserDecorator() user: User) {
    return this.agentService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新 Agent' })
  @ApiResponse({ type: Agent })
  update(@Param('id') id: string, @Body() updateAgentDto: UpdateAgentDto, @UserDecorator() user: User) {
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
  findAllConversations(@Param('agentId') agentId: string, @UserDecorator() user: User) {
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
    return this.agentService.updateConversation(id, updateConversationDto, user);
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
    return this.agentService.chat(agentId, conversationId, chatRequestDto, user);
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
    const stream = await this.agentService.streamChat(agentId, conversationId, chatRequestDto, user);
    return stream.pipe(
      map(data => {
        const event = new MessageEvent('message', {
          data: JSON.stringify(data),
          lastEventId: Date.now().toString(),
          origin: '*',
        });
        return event;
      }),
    );
  }
} 