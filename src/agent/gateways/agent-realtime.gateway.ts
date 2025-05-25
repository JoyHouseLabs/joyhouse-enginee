import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { WsJwtAuthGuard } from '../../auth/guards/ws-jwt-auth.guard';
import { User } from '../../user/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from '../entities/agent.entity';
import { Conversation } from '../entities/conversation.entity';

// Agent 实时事件接口
interface AgentChatEvent {
  conversationId: string;
  agentId: string;
  messageId?: string;
  type:
    | 'message_start'
    | 'message_chunk'
    | 'message_complete'
    | 'intent_recognition'
    | 'tool_execution'
    | 'workflow_execution'
    | 'error';
  content?: string;
  data?: any;
  timestamp: Date;
  userId: string;
}

interface ClientConnection {
  socketId: string;
  userId: string;
  subscribedConversations: Set<string>;
  subscribedAgents: Set<string>;
  connectedAt: Date;
  lastActivity: Date;
}

interface IntentRecognitionEvent {
  conversationId: string;
  agentId: string;
  userMessage: string;
  recognizedIntents: any[];
  primaryIntent: any;
  suggestedActions: any[];
  confidence: number;
  timestamp: Date;
}

interface ToolExecutionEvent {
  conversationId: string;
  agentId: string;
  toolId: string;
  toolName: string;
  toolType: 'tool' | 'mcp_tool' | 'workflow';
  status: 'started' | 'completed' | 'failed';
  input?: any;
  output?: any;
  error?: string;
  duration?: number;
  timestamp: Date;
}

@Injectable()
@WebSocketGateway({
  namespace: '/agent-realtime',
  cors: {
    origin: process.env.WEBSOCKET_CORS_ORIGIN?.split(',') || [
      'http://localhost:1666',
    ],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
@UseGuards(WsJwtAuthGuard)
export class AgentRealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AgentRealtimeGateway.name);
  private clients = new Map<string, ClientConnection>();
  private conversationSubscribers = new Map<string, Set<string>>(); // conversationId -> Set<socketId>
  private agentSubscribers = new Map<string, Set<string>>(); // agentId -> Set<socketId>

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
  ) {}

  // WebSocket 连接处理
  async handleConnection(client: Socket) {
    // 用户信息已经通过WsJwtAuthGuard验证并附加到socket上
    const user: User = (client as any).user;

    if (!user) {
      this.logger.warn(
        `Client ${client.id} connected without authenticated user, disconnecting`,
      );
      client.disconnect();
      return;
    }

    const clientInfo: ClientConnection = {
      socketId: client.id,
      userId: user.id,
      subscribedConversations: new Set(),
      subscribedAgents: new Set(),
      connectedAt: new Date(),
      lastActivity: new Date(),
    };

    this.clients.set(client.id, clientInfo);
    this.logger.log(
      `Agent realtime client ${client.id} connected for authenticated user ${user.id} (${user.username})`,
    );

    // 发送连接确认
    client.emit('connected', {
      socketId: client.id,
      userId: user.id,
      username: user.username,
      timestamp: new Date(),
      message: 'Connected to agent realtime service',
      capabilities: [
        'chat_streaming',
        'intent_recognition',
        'tool_execution',
        'workflow_monitoring',
      ],
    });
  }

  async handleDisconnect(client: Socket) {
    const clientInfo = this.clients.get(client.id);
    if (clientInfo) {
      // 清理订阅
      for (const conversationId of clientInfo.subscribedConversations) {
        this.unsubscribeFromConversation(client.id, conversationId);
      }
      for (const agentId of clientInfo.subscribedAgents) {
        this.unsubscribeFromAgent(client.id, agentId);
      }
      this.clients.delete(client.id);
      this.logger.log(`Agent realtime client ${client.id} disconnected`);
    }
  }

  // 订阅对话实时更新
  @SubscribeMessage('subscribe-conversation')
  async handleSubscribeConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const { conversationId } = data;
    const clientInfo = this.clients.get(client.id);
    const user: User = (client as any).user;

    if (!clientInfo || !user) {
      client.emit('error', { message: 'Client not authenticated' });
      return;
    }

    // 权限检查 - 验证用户是否有权限访问该对话
    try {
      const conversation = await this.conversationRepo.findOne({
        where: { id: conversationId, user: { id: user.id } },
        relations: ['user'],
      });

      if (!conversation) {
        client.emit('error', {
          message: 'Conversation not found or access denied',
          conversationId,
        });
        return;
      }
    } catch (error) {
      this.logger.error(`Error checking conversation access: ${error.message}`);
      client.emit('error', {
        message: 'Failed to verify conversation access',
        conversationId,
      });
      return;
    }

    // 添加到订阅列表
    clientInfo.subscribedConversations.add(conversationId);
    clientInfo.lastActivity = new Date();

    if (!this.conversationSubscribers.has(conversationId)) {
      this.conversationSubscribers.set(conversationId, new Set());
    }
    this.conversationSubscribers.get(conversationId)!.add(client.id);

    this.logger.log(
      `Client ${client.id} (user: ${user.username}) subscribed to conversation ${conversationId}`,
    );

    client.emit('subscription-confirmed', {
      type: 'conversation',
      id: conversationId,
      timestamp: new Date(),
      message: `Subscribed to conversation ${conversationId}`,
    });
  }

  // 取消订阅对话
  @SubscribeMessage('unsubscribe-conversation')
  handleUnsubscribeConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const { conversationId } = data;
    const user: User = (client as any).user;

    if (!user) {
      client.emit('error', { message: 'Client not authenticated' });
      return;
    }

    this.unsubscribeFromConversation(client.id, conversationId);

    client.emit('unsubscription-confirmed', {
      type: 'conversation',
      id: conversationId,
      timestamp: new Date(),
      message: `Unsubscribed from conversation ${conversationId}`,
    });
  }

  // 订阅 Agent 实时更新
  @SubscribeMessage('subscribe-agent')
  async handleSubscribeAgent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { agentId: string },
  ) {
    const { agentId } = data;
    const clientInfo = this.clients.get(client.id);
    const user: User = (client as any).user;

    if (!clientInfo || !user) {
      client.emit('error', { message: 'Client not authenticated' });
      return;
    }

    // 权限检查 - 验证用户是否有权限访问该Agent
    try {
      const agent = await this.agentRepo.findOne({
        where: { id: agentId, user: { id: user.id } },
        relations: ['user'],
      });

      if (!agent) {
        client.emit('error', {
          message: 'Agent not found or access denied',
          agentId,
        });
        return;
      }
    } catch (error) {
      this.logger.error(`Error checking agent access: ${error.message}`);
      client.emit('error', {
        message: 'Failed to verify agent access',
        agentId,
      });
      return;
    }

    // 添加到订阅列表
    clientInfo.subscribedAgents.add(agentId);
    clientInfo.lastActivity = new Date();

    if (!this.agentSubscribers.has(agentId)) {
      this.agentSubscribers.set(agentId, new Set());
    }
    this.agentSubscribers.get(agentId)!.add(client.id);

    this.logger.log(
      `Client ${client.id} (user: ${user.username}) subscribed to agent ${agentId}`,
    );

    client.emit('subscription-confirmed', {
      type: 'agent',
      id: agentId,
      timestamp: new Date(),
      message: `Subscribed to agent ${agentId}`,
    });
  }

  // 取消订阅 Agent
  @SubscribeMessage('unsubscribe-agent')
  handleUnsubscribeAgent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { agentId: string },
  ) {
    const { agentId } = data;
    const user: User = (client as any).user;

    if (!user) {
      client.emit('error', { message: 'Client not authenticated' });
      return;
    }

    this.unsubscribeFromAgent(client.id, agentId);

    client.emit('unsubscription-confirmed', {
      type: 'agent',
      id: agentId,
      timestamp: new Date(),
      message: `Unsubscribed from agent ${agentId}`,
    });
  }

  // 监听聊天消息开始事件
  @OnEvent('agent.chat.started')
  handleChatStarted(data: {
    conversationId: string;
    agentId: string;
    userMessage: string;
    userId: string;
  }) {
    const event: AgentChatEvent = {
      conversationId: data.conversationId,
      agentId: data.agentId,
      type: 'message_start',
      content: data.userMessage,
      timestamp: new Date(),
      userId: data.userId,
    };

    this.broadcastToConversationSubscribers(
      data.conversationId,
      'chat-started',
      event,
    );
    this.broadcastToAgentSubscribers(data.agentId, 'chat-started', event);
  }

  // 监听聊天消息流式输出
  @OnEvent('agent.chat.chunk')
  handleChatChunk(data: {
    conversationId: string;
    agentId: string;
    messageId: string;
    chunk: string;
    userId: string;
  }) {
    const event: AgentChatEvent = {
      conversationId: data.conversationId,
      agentId: data.agentId,
      messageId: data.messageId,
      type: 'message_chunk',
      content: data.chunk,
      timestamp: new Date(),
      userId: data.userId,
    };

    this.broadcastToConversationSubscribers(
      data.conversationId,
      'chat-chunk',
      event,
    );
    this.broadcastToAgentSubscribers(data.agentId, 'chat-chunk', event);
  }

  // 监听聊天消息完成事件
  @OnEvent('agent.chat.completed')
  handleChatCompleted(data: {
    conversationId: string;
    agentId: string;
    messageId: string;
    finalMessage: string;
    userId: string;
    metadata?: any;
  }) {
    const event: AgentChatEvent = {
      conversationId: data.conversationId,
      agentId: data.agentId,
      messageId: data.messageId,
      type: 'message_complete',
      content: data.finalMessage,
      data: data.metadata,
      timestamp: new Date(),
      userId: data.userId,
    };

    this.broadcastToConversationSubscribers(
      data.conversationId,
      'chat-completed',
      event,
    );
    this.broadcastToAgentSubscribers(data.agentId, 'chat-completed', event);
  }

  // 监听意图识别事件
  @OnEvent('agent.intent.recognized')
  handleIntentRecognized(data: IntentRecognitionEvent) {
    const event: AgentChatEvent = {
      conversationId: data.conversationId,
      agentId: data.agentId,
      type: 'intent_recognition',
      data: {
        userMessage: data.userMessage,
        recognizedIntents: data.recognizedIntents,
        primaryIntent: data.primaryIntent,
        suggestedActions: data.suggestedActions,
        confidence: data.confidence,
      },
      timestamp: data.timestamp,
      userId: '', // 从事件数据中获取
    };

    this.broadcastToConversationSubscribers(
      data.conversationId,
      'intent-recognized',
      event,
    );
    this.broadcastToAgentSubscribers(data.agentId, 'intent-recognized', event);
  }

  // 监听工具执行事件
  @OnEvent('agent.tool.execution')
  handleToolExecution(data: ToolExecutionEvent) {
    const event: AgentChatEvent = {
      conversationId: data.conversationId,
      agentId: data.agentId,
      type: 'tool_execution',
      data: {
        toolId: data.toolId,
        toolName: data.toolName,
        toolType: data.toolType,
        status: data.status,
        input: data.input,
        output: data.output,
        error: data.error,
        duration: data.duration,
      },
      timestamp: data.timestamp,
      userId: '', // 从事件数据中获取
    };

    this.broadcastToConversationSubscribers(
      data.conversationId,
      'tool-execution',
      event,
    );
    this.broadcastToAgentSubscribers(data.agentId, 'tool-execution', event);
  }

  // 监听工作流执行事件
  @OnEvent('agent.workflow.execution')
  handleWorkflowExecution(data: {
    conversationId: string;
    agentId: string;
    workflowId: string;
    workflowName: string;
    executionId: string;
    status: string;
    userId: string;
    data?: any;
  }) {
    const event: AgentChatEvent = {
      conversationId: data.conversationId,
      agentId: data.agentId,
      type: 'workflow_execution',
      data: {
        workflowId: data.workflowId,
        workflowName: data.workflowName,
        executionId: data.executionId,
        status: data.status,
        ...data.data,
      },
      timestamp: new Date(),
      userId: data.userId,
    };

    this.broadcastToConversationSubscribers(
      data.conversationId,
      'workflow-execution',
      event,
    );
    this.broadcastToAgentSubscribers(data.agentId, 'workflow-execution', event);
  }

  // 监听错误事件
  @OnEvent('agent.error')
  handleAgentError(data: {
    conversationId: string;
    agentId: string;
    error: string;
    userId: string;
    context?: any;
  }) {
    const event: AgentChatEvent = {
      conversationId: data.conversationId,
      agentId: data.agentId,
      type: 'error',
      content: data.error,
      data: data.context,
      timestamp: new Date(),
      userId: data.userId,
    };

    this.broadcastToConversationSubscribers(
      data.conversationId,
      'agent-error',
      event,
    );
    this.broadcastToAgentSubscribers(data.agentId, 'agent-error', event);
  }

  // 公共方法：手动发送消息到对话
  public sendToConversation(conversationId: string, event: string, data: any) {
    this.broadcastToConversationSubscribers(conversationId, event, {
      ...data,
      timestamp: new Date(),
    });
  }

  // 公共方法：手动发送消息到 Agent
  public sendToAgent(agentId: string, event: string, data: any) {
    this.broadcastToAgentSubscribers(agentId, event, {
      ...data,
      timestamp: new Date(),
    });
  }

  // 公共方法：获取连接统计
  public getConnectionStats() {
    return {
      totalConnections: this.clients.size,
      conversationSubscriptions: this.conversationSubscribers.size,
      agentSubscriptions: this.agentSubscribers.size,
      totalSubscriptions:
        Array.from(this.conversationSubscribers.values()).reduce(
          (sum, subscribers) => sum + subscribers.size,
          0,
        ) +
        Array.from(this.agentSubscribers.values()).reduce(
          (sum, subscribers) => sum + subscribers.size,
          0,
        ),
    };
  }

  // 私有方法：取消订阅对话
  private unsubscribeFromConversation(
    socketId: string,
    conversationId: string,
  ) {
    const clientInfo = this.clients.get(socketId);
    if (clientInfo) {
      clientInfo.subscribedConversations.delete(conversationId);
    }

    const subscribers = this.conversationSubscribers.get(conversationId);
    if (subscribers) {
      subscribers.delete(socketId);
      if (subscribers.size === 0) {
        this.conversationSubscribers.delete(conversationId);
      }
    }
  }

  // 私有方法：取消订阅 Agent
  private unsubscribeFromAgent(socketId: string, agentId: string) {
    const clientInfo = this.clients.get(socketId);
    if (clientInfo) {
      clientInfo.subscribedAgents.delete(agentId);
    }

    const subscribers = this.agentSubscribers.get(agentId);
    if (subscribers) {
      subscribers.delete(socketId);
      if (subscribers.size === 0) {
        this.agentSubscribers.delete(agentId);
      }
    }
  }

  // 私有方法：广播给对话订阅者
  private broadcastToConversationSubscribers(
    conversationId: string,
    event: string,
    data: any,
  ) {
    const subscribers = this.conversationSubscribers.get(conversationId);
    if (!subscribers || subscribers.size === 0) {
      return;
    }

    for (const socketId of subscribers) {
      const client = this.server.sockets.sockets.get(socketId);
      if (client) {
        client.emit(event, data);
      } else {
        // 清理无效的socket连接
        subscribers.delete(socketId);
      }
    }
  }

  // 私有方法：广播给 Agent 订阅者
  private broadcastToAgentSubscribers(
    agentId: string,
    event: string,
    data: any,
  ) {
    const subscribers = this.agentSubscribers.get(agentId);
    if (!subscribers || subscribers.size === 0) {
      return;
    }

    for (const socketId of subscribers) {
      const client = this.server.sockets.sockets.get(socketId);
      if (client) {
        client.emit(event, data);
      } else {
        // 清理无效的socket连接
        subscribers.delete(socketId);
      }
    }
  }
}
