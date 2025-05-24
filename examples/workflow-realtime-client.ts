import { io, Socket } from 'socket.io-client';

// 工作流实时客户端类
export class WorkflowRealtimeClient {
  private socket: Socket;
  private userId: string;
  private token: string;
  private serverUrl: string;
  private subscribedExecutions = new Set<string>();
  private eventHandlers = new Map<string, Function[]>();

  constructor(serverUrl: string, userId: string, token: string) {
    this.userId = userId;
    this.token = token;
    this.serverUrl = serverUrl;
    
    this.connectSocket();
  }

  private connectSocket() {
    // 连接到工作流实时 WebSocket
    this.socket = io(`${this.serverUrl}/workflow-monitor`, {
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
      console.log('Connected to workflow monitor:', data);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from workflow monitor');
    });

    this.socket.on('error', (error) => {
      console.error('Workflow monitor error:', error);
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

    // 工作流执行事件
    this.socket.on('workflow-started', (data) => {
      console.log('Workflow started:', data);
      this.emit('workflow-started', data);
    });

    this.socket.on('workflow-completed', (data) => {
      console.log('Workflow completed:', data);
      this.emit('workflow-completed', data);
    });

    this.socket.on('workflow-failed', (data) => {
      console.log('Workflow failed:', data);
      this.emit('workflow-failed', data);
    });

    // 节点执行事件
    this.socket.on('node-started', (data) => {
      console.log('Node started:', data);
      this.emit('node-started', data);
    });

    this.socket.on('node-completed', (data) => {
      console.log('Node completed:', data);
      this.emit('node-completed', data);
    });

    this.socket.on('node-failed', (data) => {
      console.log('Node failed:', data);
      this.emit('node-failed', data);
    });

    // 性能事件
    this.socket.on('performance-warning', (data) => {
      console.warn('Performance warning:', data);
      this.emit('performance-warning', data);
    });

    this.socket.on('performance-critical', (data) => {
      console.error('Performance critical:', data);
      this.emit('performance-critical', data);
    });
  }

  // 订阅工作流执行监控
  async subscribeToExecution(executionId: string): Promise<void> {
    if (this.subscribedExecutions.has(executionId)) {
      console.log(`Already subscribed to execution ${executionId}`);
      return;
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('subscribe-execution', { executionId });
      
      const timeout = setTimeout(() => {
        reject(new Error('Subscription timeout'));
      }, 5000);

      const handler = (data: any) => {
        if (data.executionId === executionId) {
          clearTimeout(timeout);
          this.subscribedExecutions.add(executionId);
          this.socket.off('subscription-confirmed', handler);
          resolve();
        }
      };

      this.socket.on('subscription-confirmed', handler);
    });
  }

  // 取消订阅工作流执行
  async unsubscribeFromExecution(executionId: string): Promise<void> {
    if (!this.subscribedExecutions.has(executionId)) {
      console.log(`Not subscribed to execution ${executionId}`);
      return;
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('unsubscribe-execution', { executionId });
      
      const timeout = setTimeout(() => {
        reject(new Error('Unsubscription timeout'));
      }, 5000);

      const handler = (data: any) => {
        if (data.executionId === executionId) {
          clearTimeout(timeout);
          this.subscribedExecutions.delete(executionId);
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

  // 更新token（用于token刷新）
  updateToken(newToken: string): void {
    this.token = newToken;
    // 重新连接以使用新token
    this.socket.disconnect();
    this.connectSocket();
  }

  // 获取当前token
  getToken(): string {
    return this.token;
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
      executions: Array.from(this.subscribedExecutions)
    };
  }
}

// 使用示例
export async function exampleUsage() {
  // 创建客户端
  const client = new WorkflowRealtimeClient('http://localhost:3000', 'user123', 'your-jwt-token');

  // 等待连接
  await new Promise(resolve => {
    client.on('connected', resolve);
  });

  // 订阅工作流执行
  await client.subscribeToExecution('execution-id-123');

  // 添加事件监听器
  client.on('workflow-started', (data) => {
    console.log('🚀 工作流开始:', data.workflowName);
  });

  client.on('node-started', (data) => {
    console.log('🔧 节点开始:', data.nodeName);
  });

  client.on('node-completed', (data) => {
    console.log('✅ 节点完成:', data.nodeName, `(${data.duration}ms)`);
  });

  client.on('node-failed', (data) => {
    console.log('❌ 节点失败:', data.nodeName, data.error);
  });

  client.on('workflow-completed', (data) => {
    console.log('✨ 工作流完成:', data.workflowName);
  });

  client.on('workflow-failed', (data) => {
    console.error('💥 工作流失败:', data.workflowName, data.error);
  });

  client.on('performance-warning', (data) => {
    console.warn('⚠️ 性能警告:', data.message);
  });

  client.on('performance-critical', (data) => {
    console.error('🚨 性能严重:', data.message);
  });

  client.on('auth-error', (data) => {
    console.error('🔒 认证错误:', data.message);
  });

  console.log('工作流监控客户端已准备就绪');
} 