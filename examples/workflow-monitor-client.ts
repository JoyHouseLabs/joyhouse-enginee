import { io, Socket } from 'socket.io-client';

// 工作流监控客户端类
export class WorkflowMonitorClient {
  private socket: Socket;
  private userId: string;
  private subscribedExecutions = new Set<string>();
  private eventHandlers = new Map<string, Function[]>();

  constructor(serverUrl: string, userId: string) {
    this.userId = userId;
    
    // 连接到工作流监控WebSocket
    this.socket = io(`${serverUrl}/workflow-monitor`, {
      auth: {
        userId: this.userId
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupEventListeners();
  }

  // 设置基础事件监听器
  private setupEventListeners() {
    this.socket.on('connect', () => {
      console.log(`Connected to workflow monitor as user ${this.userId}`);
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`Disconnected from workflow monitor: ${reason}`);
    });

    this.socket.on('connected', (data) => {
      console.log('Connection confirmed:', data);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // 工作流级别事件
    this.socket.on('workflow-started', (data) => {
      this.emit('workflow-started', data);
      console.log(`Workflow ${data.executionId} started`);
    });

    this.socket.on('workflow-completed', (data) => {
      this.emit('workflow-completed', data);
      console.log(`Workflow ${data.executionId} completed in ${data.duration}ms`);
      if (data.performance) {
        console.log('Performance summary:', data.performance);
      }
    });

    this.socket.on('workflow-failed', (data) => {
      this.emit('workflow-failed', data);
      console.error(`Workflow ${data.executionId} failed: ${data.error}`);
    });

    // 节点级别事件
    this.socket.on('node-started', (data) => {
      this.emit('node-started', data);
      console.log(`Node ${data.nodeId} (${data.nodeType}) started`);
    });

    this.socket.on('node-completed', (data) => {
      this.emit('node-completed', data);
      console.log(`Node ${data.nodeId} completed in ${data.duration}ms`);
    });

    this.socket.on('node-failed', (data) => {
      this.emit('node-failed', data);
      console.error(`Node ${data.nodeId} failed: ${data.error}`);
    });

    this.socket.on('node-waiting', (data) => {
      this.emit('node-waiting', data);
      console.log(`Node ${data.nodeId} waiting for ${data.metadata?.waitingFor}`);
    });

    // 订阅确认事件
    this.socket.on('subscription-confirmed', (data) => {
      console.log(`Subscribed to execution ${data.executionId}`);
    });

    this.socket.on('unsubscription-confirmed', (data) => {
      console.log(`Unsubscribed from execution ${data.executionId}`);
    });

    // 性能数据事件
    this.socket.on('execution-performance', (data) => {
      this.emit('execution-performance', data);
      console.log('Execution performance:', data.performance);
    });
  }

  // 订阅工作流执行监控
  subscribeToExecution(executionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.subscribedExecutions.has(executionId)) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Subscription timeout'));
      }, 5000);

      this.socket.once('subscription-confirmed', (data) => {
        if (data.executionId === executionId) {
          clearTimeout(timeout);
          this.subscribedExecutions.add(executionId);
          resolve();
        }
      });

      this.socket.emit('subscribe-execution', { executionId });
    });
  }

  // 取消订阅工作流执行监控
  unsubscribeFromExecution(executionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.subscribedExecutions.has(executionId)) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Unsubscription timeout'));
      }, 5000);

      this.socket.once('unsubscription-confirmed', (data) => {
        if (data.executionId === executionId) {
          clearTimeout(timeout);
          this.subscribedExecutions.delete(executionId);
          resolve();
        }
      });

      this.socket.emit('unsubscribe-execution', { executionId });
    });
  }

  // 获取执行性能统计
  getExecutionPerformance(executionId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Performance request timeout'));
      }, 5000);

      this.socket.once('execution-performance', (data) => {
        if (data.executionId === executionId) {
          clearTimeout(timeout);
          resolve(data.performance);
        }
      });

      this.socket.emit('get-execution-performance', { executionId });
    });
  }

  // 添加事件监听器
  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  // 移除事件监听器
  off(event: string, handler?: Function) {
    if (!this.eventHandlers.has(event)) return;
    
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
  private emit(event: string, data: any) {
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
  disconnect() {
    this.socket.disconnect();
  }

  // 获取连接状态
  isConnected(): boolean {
    return this.socket.connected;
  }

  // 获取已订阅的执行列表
  getSubscribedExecutions(): string[] {
    return Array.from(this.subscribedExecutions);
  }
}

// 使用示例
export class WorkflowPerformanceMonitor {
  private client: WorkflowMonitorClient;
  private executionMetrics = new Map<string, {
    startTime: number;
    nodeMetrics: Map<string, {
      startTime: number;
      endTime?: number;
      duration?: number;
      status: string;
    }>;
    totalDuration?: number;
    status: string;
  }>();

  constructor(serverUrl: string, userId: string) {
    this.client = new WorkflowMonitorClient(serverUrl, userId);
    this.setupMonitoring();
  }

  private setupMonitoring() {
    // 监控工作流开始
    this.client.on('workflow-started', (data: any) => {
      this.executionMetrics.set(data.executionId, {
        startTime: Date.now(),
        nodeMetrics: new Map(),
        status: 'running'
      });
      
      console.log(`📊 Monitoring started for workflow ${data.executionId}`);
      this.logWorkflowProgress(data.executionId, data);
    });

    // 监控节点开始
    this.client.on('node-started', (data: any) => {
      const metrics = this.executionMetrics.get(data.executionId);
      if (metrics) {
        metrics.nodeMetrics.set(data.nodeId, {
          startTime: Date.now(),
          status: 'running'
        });
      }
      
      console.log(`🚀 Node ${data.nodeId} (${data.nodeType}) started`);
    });

    // 监控节点完成
    this.client.on('node-completed', (data: any) => {
      const metrics = this.executionMetrics.get(data.executionId);
      if (metrics) {
        const nodeMetric = metrics.nodeMetrics.get(data.nodeId);
        if (nodeMetric) {
          nodeMetric.endTime = Date.now();
          nodeMetric.duration = data.duration;
          nodeMetric.status = 'completed';
        }
      }
      
      console.log(`✅ Node ${data.nodeId} completed in ${data.duration}ms`);
      this.checkForBottlenecks(data.executionId, data.nodeId, data.duration);
    });

    // 监控节点失败
    this.client.on('node-failed', (data: any) => {
      const metrics = this.executionMetrics.get(data.executionId);
      if (metrics) {
        const nodeMetric = metrics.nodeMetrics.get(data.nodeId);
        if (nodeMetric) {
          nodeMetric.endTime = Date.now();
          nodeMetric.duration = data.duration;
          nodeMetric.status = 'failed';
        }
      }
      
      console.error(`❌ Node ${data.nodeId} failed after ${data.duration}ms: ${data.error}`);
    });

    // 监控工作流完成
    this.client.on('workflow-completed', (data: any) => {
      const metrics = this.executionMetrics.get(data.executionId);
      if (metrics) {
        metrics.totalDuration = data.duration;
        metrics.status = 'completed';
      }
      
      console.log(`🎉 Workflow ${data.executionId} completed in ${data.duration}ms`);
      this.generatePerformanceReport(data.executionId);
    });

    // 监控工作流失败
    this.client.on('workflow-failed', (data: any) => {
      const metrics = this.executionMetrics.get(data.executionId);
      if (metrics) {
        metrics.totalDuration = data.duration;
        metrics.status = 'failed';
      }
      
      console.error(`💥 Workflow ${data.executionId} failed: ${data.error}`);
      this.generatePerformanceReport(data.executionId);
    });
  }

  // 订阅工作流监控
  async monitorExecution(executionId: string) {
    try {
      await this.client.subscribeToExecution(executionId);
      console.log(`🔍 Started monitoring execution ${executionId}`);
    } catch (error) {
      console.error(`Failed to monitor execution ${executionId}:`, error);
    }
  }

  // 停止监控工作流
  async stopMonitoring(executionId: string) {
    try {
      await this.client.unsubscribeFromExecution(executionId);
      this.executionMetrics.delete(executionId);
      console.log(`🛑 Stopped monitoring execution ${executionId}`);
    } catch (error) {
      console.error(`Failed to stop monitoring execution ${executionId}:`, error);
    }
  }

  // 检查性能瓶颈
  private checkForBottlenecks(executionId: string, nodeId: string, duration: number) {
    const thresholds = {
      warning: 5000,  // 5秒
      critical: 30000 // 30秒
    };

    if (duration > thresholds.critical) {
      console.warn(`🚨 CRITICAL: Node ${nodeId} took ${duration}ms (>${thresholds.critical}ms)`);
    } else if (duration > thresholds.warning) {
      console.warn(`⚠️  WARNING: Node ${nodeId} took ${duration}ms (>${thresholds.warning}ms)`);
    }
  }

  // 记录工作流进度
  private logWorkflowProgress(executionId: string, data: any) {
    if (data.progress) {
      const { completedNodes, totalNodes, currentNode } = data.progress;
      const percentage = Math.round((completedNodes / totalNodes) * 100);
      console.log(`📈 Progress: ${percentage}% (${completedNodes}/${totalNodes}) - Current: ${currentNode}`);
    }
  }

  // 生成性能报告
  private generatePerformanceReport(executionId: string) {
    const metrics = this.executionMetrics.get(executionId);
    if (!metrics) return;

    console.log(`\n📊 Performance Report for ${executionId}`);
    console.log(`Total Duration: ${metrics.totalDuration}ms`);
    console.log(`Status: ${metrics.status}`);
    console.log(`Nodes Executed: ${metrics.nodeMetrics.size}`);

    // 节点性能统计
    const nodePerformance: Array<{nodeId: string, duration: number, status: string}> = [];
    for (const [nodeId, nodeMetric] of metrics.nodeMetrics) {
      if (nodeMetric.duration) {
        nodePerformance.push({
          nodeId,
          duration: nodeMetric.duration,
          status: nodeMetric.status
        });
      }
    }

    // 按执行时间排序
    nodePerformance.sort((a, b) => b.duration - a.duration);

    console.log('\n🏆 Top 5 Slowest Nodes:');
    nodePerformance.slice(0, 5).forEach((node, index) => {
      console.log(`${index + 1}. ${node.nodeId}: ${node.duration}ms (${node.status})`);
    });

    // 计算平均执行时间
    const avgDuration = nodePerformance.reduce((sum, node) => sum + node.duration, 0) / nodePerformance.length;
    console.log(`\n📊 Average Node Duration: ${Math.round(avgDuration)}ms`);

    // 识别瓶颈
    const bottlenecks = nodePerformance.filter(node => node.duration > 5000);
    if (bottlenecks.length > 0) {
      console.log(`\n🚨 Performance Bottlenecks (>5s):`);
      bottlenecks.forEach(node => {
        console.log(`- ${node.nodeId}: ${node.duration}ms`);
      });
    }

    console.log('\n' + '='.repeat(50));
  }

  // 获取实时性能数据
  async getPerformanceData(executionId: string) {
    try {
      const performance = await this.client.getExecutionPerformance(executionId);
      return performance;
    } catch (error) {
      console.error(`Failed to get performance data for ${executionId}:`, error);
      return null;
    }
  }

  // 断开连接
  disconnect() {
    this.client.disconnect();
  }
}

// 使用示例
async function example() {
  const monitor = new WorkflowPerformanceMonitor('http://localhost:1666', 'user123');
  
  // 监控特定工作流执行
  await monitor.monitorExecution('execution-id-123');
  
  // 获取性能数据
  const performance = await monitor.getPerformanceData('execution-id-123');
  console.log('Performance data:', performance);
  
  // 停止监控
  setTimeout(async () => {
    await monitor.stopMonitoring('execution-id-123');
    monitor.disconnect();
  }, 60000); // 1分钟后停止监控
}

export { example }; 