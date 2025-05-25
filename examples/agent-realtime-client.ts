import { io, Socket } from 'socket.io-client';

// Agent 实时客户端类
export class AgentRealtimeClient {
  private socket: Socket;
  private userId: string;
  private token: string;
  private subscribedConversations = new Set<string>();
  private subscribedAgents = new Set<string>();
  private eventHandlers = new Map<string, Function[]>();
  private serverUrl: string;

  constructor(serverUrl: string, userId: string, token: string) {
    this.userId = userId;
    this.token = token;
    this.serverUrl = serverUrl;
    
    // 连接到 Agent 实时 WebSocket
    this.socket = io(`${serverUrl}/agent-realtime`, {
      auth: {
        token: this.token
      },
      extraHeaders: {
        'Authorization': `Bearer ${this.token}`
      },
      query: {
        token: this.token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    // 连接事件
    this.socket.on('connected', (data) => {
      console.log('Connected to agent realtime service:', data);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from agent realtime service');
    });

    this.socket.on('error', (error) => {
      console.error('Agent realtime error:', error);
    });

    // 认证错误事件
    this.socket.on('auth-error', (error) => {
      console.error('Authentication error:', error);
      this.emit('auth-error', error);
    });

    // 订阅确认事件
    this.socket.on('subscription-confirmed', (data) => {
      console.log('Subscription confirmed:', data);
    });

    this.socket.on('unsubscription-confirmed', (data) => {
      console.log('Unsubscription confirmed:', data);
    });

    // Agent 聊天事件
    this.socket.on('chat-started', (data) => {
      console.log('Chat started:', data);
      this.emit('chat-started', data);
    });

    this.socket.on('chat-chunk', (data) => {
      console.log('Chat chunk:', data);
      this.emit('chat-chunk', data);
    });

    this.socket.on('chat-completed', (data) => {
      console.log('Chat completed:', data);
      this.emit('chat-completed', data);
    });

    // 意图识别事件
    this.socket.on('intent-recognized', (data) => {
      console.log('Intent recognized:', data);
      this.emit('intent-recognized', data);
    });

    // 工具执行事件
    this.socket.on('tool-execution', (data) => {
      console.log('Tool execution:', data);
      this.emit('tool-execution', data);
    });

    // 工作流执行事件
    this.socket.on('workflow-execution', (data) => {
      console.log('Workflow execution:', data);
      this.emit('workflow-execution', data);
    });

    // 错误事件
    this.socket.on('agent-error', (data) => {
      console.error('Agent error:', data);
      this.emit('agent-error', data);
    });
  }

  // 订阅对话实时更新
  async subscribeToConversation(conversationId: string): Promise<void> {
    if (this.subscribedConversations.has(conversationId)) {
      console.log(`Already subscribed to conversation ${conversationId}`);
      return;
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('subscribe-conversation', { conversationId });
      
      const timeout = setTimeout(() => {
        reject(new Error('Subscription timeout'));
      }, 5000);

      const handler = (data: any) => {
        if (data.type === 'conversation' && data.id === conversationId) {
          clearTimeout(timeout);
          this.subscribedConversations.add(conversationId);
          this.socket.off('subscription-confirmed', handler);
          resolve();
        }
      };

      this.socket.on('subscription-confirmed', handler);
    });
  }

  // 取消订阅对话
  async unsubscribeFromConversation(conversationId: string): Promise<void> {
    if (!this.subscribedConversations.has(conversationId)) {
      console.log(`Not subscribed to conversation ${conversationId}`);
      return;
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('unsubscribe-conversation', { conversationId });
      
      const timeout = setTimeout(() => {
        reject(new Error('Unsubscription timeout'));
      }, 5000);

      const handler = (data: any) => {
        if (data.type === 'conversation' && data.id === conversationId) {
          clearTimeout(timeout);
          this.subscribedConversations.delete(conversationId);
          this.socket.off('unsubscription-confirmed', handler);
          resolve();
        }
      };

      this.socket.on('unsubscription-confirmed', handler);
    });
  }

  // 订阅 Agent 实时更新
  async subscribeToAgent(agentId: string): Promise<void> {
    if (this.subscribedAgents.has(agentId)) {
      console.log(`Already subscribed to agent ${agentId}`);
      return;
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('subscribe-agent', { agentId });
      
      const timeout = setTimeout(() => {
        reject(new Error('Subscription timeout'));
      }, 5000);

      const handler = (data: any) => {
        if (data.type === 'agent' && data.id === agentId) {
          clearTimeout(timeout);
          this.subscribedAgents.add(agentId);
          this.socket.off('subscription-confirmed', handler);
          resolve();
        }
      };

      this.socket.on('subscription-confirmed', handler);
    });
  }

  // 取消订阅 Agent
  async unsubscribeFromAgent(agentId: string): Promise<void> {
    if (!this.subscribedAgents.has(agentId)) {
      console.log(`Not subscribed to agent ${agentId}`);
      return;
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('unsubscribe-agent', { agentId });
      
      const timeout = setTimeout(() => {
        reject(new Error('Unsubscription timeout'));
      }, 5000);

      const handler = (data: any) => {
        if (data.type === 'agent' && data.id === agentId) {
          clearTimeout(timeout);
          this.subscribedAgents.delete(agentId);
          this.socket.off('unsubscription-confirmed', handler);
          resolve();
        }
      };

      this.socket.on('unsubscription-confirmed', handler);
    });
  }

  // 添加事件监听器
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  // 移除事件监听器
  off(event: string, handler?: Function): void {
    if (!this.eventHandlers.has(event)) {
      return;
    }

    if (handler) {
      const handlers = this.eventHandlers.get(event)!;
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    } else {
      this.eventHandlers.delete(event);
    }
  }

  // 触发事件
  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  // 断开连接
  disconnect(): void {
    this.socket.disconnect();
  }

  // 获取连接状态
  isConnected(): boolean {
    return this.socket.connected;
  }

  // 获取订阅状态
  getSubscriptions() {
    return {
      conversations: Array.from(this.subscribedConversations),
      agents: Array.from(this.subscribedAgents)
    };
  }

  // 更新token（用于token刷新）
  updateToken(newToken: string): void {
    this.token = newToken;
    // 重新连接以使用新token
    this.socket.disconnect();
    
    // 重新创建socket连接
    this.socket = io(`${this.serverUrl}/agent-realtime`, {
      auth: {
        token: this.token
      },
      extraHeaders: {
        'Authorization': `Bearer ${this.token}`
      },
      query: {
        token: this.token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    this.setupEventListeners();
  }

  // 获取当前token
  getToken(): string {
    return this.token;
  }
}

// 使用示例
export async function exampleUsage() {
  // 创建客户端
  const client = new AgentRealtimeClient('http://localhost:1666', 'user123', 'token123');

  // 等待连接
  await new Promise(resolve => {
    client.on('connected', resolve);
  });

  // 订阅对话和 Agent
  await client.subscribeToConversation('conversation-id-123');
  await client.subscribeToAgent('agent-id-456');

  // 添加事件监听器
  client.on('chat-started', (data) => {
    console.log('聊天开始:', data.content);
  });

  client.on('intent-recognized', (data) => {
    console.log('识别意图:', data.data.primaryIntent);
    console.log('建议动作:', data.data.suggestedActions);
  });

  client.on('tool-execution', (data) => {
    console.log(`工具执行 ${data.data.status}:`, {
      tool: data.data.toolName,
      type: data.data.toolType,
      duration: data.data.duration
    });
  });

  client.on('workflow-execution', (data) => {
    console.log('工作流执行:', {
      workflow: data.data.workflowName,
      status: data.data.status,
      executionId: data.data.executionId
    });
  });

  client.on('chat-completed', (data) => {
    console.log('聊天完成:', data.content);
  });

  client.on('agent-error', (data) => {
    console.error('Agent 错误:', data.content);
  });

  // 模拟发送聊天消息（通过 HTTP API）
  // 这会触发上面监听的 WebSocket 事件
  console.log('现在可以通过 HTTP API 发送聊天消息，WebSocket 会实时推送事件');
} 