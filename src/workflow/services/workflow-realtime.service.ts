import { Injectable, Logger, UseGuards } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WsJwtAuthGuard } from '../../auth/guards/ws-jwt-auth.guard';
import { User } from '../../user/user.entity';
import { WorkflowExecution } from '../entities/workflow-execution.entity';
import { Workflow, WorkflowNode } from '../entities/workflow.entity';
import {
  JoyhouseConfigService,
  MonitoringConfig,
} from '../../common/joyhouse-config';

// 节点执行事件接口
interface NodeExecutionEvent {
  executionId: string;
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  status: 'started' | 'completed' | 'failed' | 'waiting';
  timestamp: Date;
  duration?: number;
  input?: any;
  output?: any;
  error?: string;
  metadata?: {
    retryAttempt?: number;
    totalRetries?: number;
    memoryUsage?: number;
    cpuTime?: number;
    waitingFor?: string;
    estimatedWaitTime?: number;
  };
}

// 工作流执行事件接口
interface WorkflowExecutionEvent {
  executionId: string;
  workflowId: string;
  workflowName: string;
  status: 'started' | 'running' | 'completed' | 'failed' | 'paused';
  timestamp: Date;
  duration?: number;
  progress?: {
    completedNodes: number;
    totalNodes: number;
    currentNode: string;
  };
  performance?: {
    totalDuration: number;
    nodeExecutions: Array<{
      nodeId: string;
      duration: number;
      status: string;
    }>;
    bottlenecks: Array<{
      nodeId: string;
      duration: number;
      reason: string;
    }>;
    slowestNode?: { nodeId: string; duration: number } | null;
    averageNodeDuration?: number;
  };
}

// 客户端连接信息
interface ClientConnection {
  socketId: string;
  userId: string;
  subscribedExecutions: Set<string>;
  connectedAt: Date;
  lastActivity: Date;
}

@Injectable()
@WebSocketGateway({
  namespace: () =>
    JoyhouseConfigService.getMonitoringConfig().websocket.namespace,
  cors: {
    origin: () =>
      JoyhouseConfigService.getMonitoringConfig().websocket.corsOrigin,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
@UseGuards(WsJwtAuthGuard)
export class WorkflowRealtimeService
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WorkflowRealtimeService.name);
  private clients = new Map<string, ClientConnection>();
  private executionSubscribers = new Map<string, Set<string>>(); // executionId -> Set<socketId>
  private nodeExecutionTimes = new Map<string, Map<string, number>>(); // executionId -> nodeId -> startTime
  private monitoringConfig: MonitoringConfig;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(WorkflowExecution)
    private readonly workflowExecutionRepo: Repository<WorkflowExecution>,
    @InjectRepository(Workflow)
    private readonly workflowRepo: Repository<Workflow>,
  ) {
    this.monitoringConfig = JoyhouseConfigService.getMonitoringConfig();
    this.logger.log(`Monitoring service initialized with config:`, {
      enabled: this.monitoringConfig.enabled,
      namespace: this.monitoringConfig.websocket.namespace,
      performanceTracking: this.monitoringConfig.performance.trackingEnabled,
    });
  }

  // 检查监控是否启用
  private isMonitoringEnabled(): boolean {
    return this.monitoringConfig.enabled;
  }

  // 检查性能跟踪是否启用
  private isPerformanceTrackingEnabled(): boolean {
    return this.monitoringConfig.performance.trackingEnabled;
  }

  // 检查特定事件类型是否启用
  private isEventTypeEnabled(
    eventType: 'node' | 'workflow' | 'performance',
  ): boolean {
    switch (eventType) {
      case 'node':
        return this.monitoringConfig.events.enableNodeEvents;
      case 'workflow':
        return this.monitoringConfig.events.enableWorkflowEvents;
      case 'performance':
        return this.monitoringConfig.events.enablePerformanceEvents;
      default:
        return false;
    }
  }

  // WebSocket 连接处理
  async handleConnection(client: Socket) {
    if (!this.isMonitoringEnabled()) {
      this.logger.warn('Monitoring is disabled, rejecting connection');
      client.disconnect();
      return;
    }

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
      subscribedExecutions: new Set(),
      connectedAt: new Date(),
      lastActivity: new Date(),
    };

    this.clients.set(client.id, clientInfo);
    this.logger.log(
      `Workflow monitoring client ${client.id} connected for authenticated user ${user.id} (${user.username})`,
    );

    // 发送连接确认和配置信息
    client.emit('connected', {
      socketId: client.id,
      userId: user.id,
      username: user.username,
      timestamp: new Date(),
      message: 'Connected to workflow monitor',
      config: {
        performanceTracking: this.isPerformanceTrackingEnabled(),
        enabledEvents: {
          node: this.isEventTypeEnabled('node'),
          workflow: this.isEventTypeEnabled('workflow'),
          performance: this.isEventTypeEnabled('performance'),
        },
        thresholds: {
          warning: this.monitoringConfig.performance.warningThresholdMs,
          critical: this.monitoringConfig.performance.criticalThresholdMs,
        },
      },
    });
  }

  async handleDisconnect(client: Socket) {
    const clientInfo = this.clients.get(client.id);
    if (clientInfo) {
      // 清理订阅
      for (const executionId of clientInfo.subscribedExecutions) {
        this.unsubscribeFromExecution(client.id, executionId);
      }
      this.clients.delete(client.id);
      this.logger.log(`Client ${client.id} disconnected`);
    }
  }

  // 订阅工作流执行监控
  @SubscribeMessage('subscribe-execution')
  async handleSubscribeExecution(
    @ConnectedSocket() client: Socket,
    data: { executionId: string },
  ) {
    const { executionId } = data;
    const clientInfo = this.clients.get(client.id);
    const user: User = (client as any).user;

    if (!clientInfo || !user) {
      client.emit('error', { message: 'Client not authenticated' });
      return;
    }

    // 权限检查 - 验证用户是否有权限访问该工作流执行
    try {
      const execution = await this.workflowExecutionRepo.findOne({
        where: { id: executionId },
        relations: ['workflow', 'workflow.user'],
      });

      if (!execution || execution.workflow.user.id !== user.id) {
        client.emit('error', {
          message: 'Workflow execution not found or access denied',
          executionId,
        });
        return;
      }
    } catch (error) {
      this.logger.error(`Error checking execution access: ${error.message}`);
      client.emit('error', {
        message: 'Failed to verify execution access',
        executionId,
      });
      return;
    }

    // 添加到订阅列表
    clientInfo.subscribedExecutions.add(executionId);
    clientInfo.lastActivity = new Date();

    if (!this.executionSubscribers.has(executionId)) {
      this.executionSubscribers.set(executionId, new Set());
    }
    this.executionSubscribers.get(executionId)!.add(client.id);

    this.logger.log(
      `Client ${client.id} (user: ${user.username}) subscribed to execution ${executionId}`,
    );

    client.emit('subscription-confirmed', {
      executionId,
      timestamp: new Date(),
      message: `Subscribed to execution ${executionId}`,
    });

    // 发送当前执行状态（如果有的话）
    this.sendCurrentExecutionStatus(client, executionId);
  }

  // 取消订阅工作流执行监控
  @SubscribeMessage('unsubscribe-execution')
  handleUnsubscribeExecution(
    @ConnectedSocket() client: Socket,
    data: { executionId: string },
  ) {
    const { executionId } = data;
    const user: User = (client as any).user;

    if (!user) {
      client.emit('error', { message: 'Client not authenticated' });
      return;
    }

    this.unsubscribeFromExecution(client.id, executionId);

    client.emit('unsubscription-confirmed', {
      executionId,
      timestamp: new Date(),
      message: `Unsubscribed from execution ${executionId}`,
    });
  }

  // 获取执行性能统计
  @SubscribeMessage('get-execution-performance')
  handleGetExecutionPerformance(client: Socket, data: { executionId: string }) {
    const { executionId } = data;
    const performance = this.calculateExecutionPerformance(executionId);

    client.emit('execution-performance', {
      executionId,
      performance,
      timestamp: new Date(),
    });
  }

  // 监听工作流开始事件
  @OnEvent('workflow.started')
  handleWorkflowStarted(data: { execution: WorkflowExecution }) {
    if (!this.isEventTypeEnabled('workflow')) {
      return;
    }

    const { execution } = data;

    // 初始化节点执行时间记录
    if (this.isPerformanceTrackingEnabled()) {
      this.nodeExecutionTimes.set(execution.id, new Map());
    }

    const event: WorkflowExecutionEvent = {
      executionId: execution.id,
      workflowId: execution.workflow.id,
      workflowName: execution.workflow.name,
      status: 'started',
      timestamp: new Date(),
    };

    this.broadcastToExecutionSubscribers(
      execution.id,
      'workflow-started',
      event,
    );
    this.logger.log(`Workflow started: ${execution.id}`);
  }

  // 监听工作流完成事件
  @OnEvent('workflow.completed')
  handleWorkflowCompleted(data: { execution: WorkflowExecution }) {
    if (!this.isEventTypeEnabled('workflow')) {
      return;
    }

    const { execution } = data;
    const performance = this.isPerformanceTrackingEnabled()
      ? this.calculateExecutionPerformance(execution.id)
      : undefined;

    const event: WorkflowExecutionEvent = {
      executionId: execution.id,
      workflowId: execution.workflow.id,
      workflowName: execution.workflow.name,
      status: 'completed',
      timestamp: new Date(),
      duration:
        execution.completedAt && execution.startedAt
          ? execution.completedAt.getTime() - execution.startedAt.getTime()
          : undefined,
      performance,
    };

    this.broadcastToExecutionSubscribers(
      execution.id,
      'workflow-completed',
      event,
    );

    // 发送性能数据（如果启用）
    if (this.isEventTypeEnabled('performance') && performance) {
      this.broadcastToExecutionSubscribers(
        execution.id,
        'execution-performance',
        {
          executionId: execution.id,
          performance,
          timestamp: new Date(),
        },
      );
    }

    this.logger.log(`Workflow completed: ${execution.id}`);

    // 清理数据
    this.cleanupExecutionData(execution.id);
  }

  // 监听工作流失败事件
  @OnEvent('workflow.failed')
  handleWorkflowFailed(data: { execution: WorkflowExecution; error: string }) {
    if (!this.isEventTypeEnabled('workflow')) {
      return;
    }

    const { execution, error } = data;

    const event: WorkflowExecutionEvent = {
      executionId: execution.id,
      workflowId: execution.workflow.id,
      workflowName: execution.workflow.name,
      status: 'failed',
      timestamp: new Date(),
      duration:
        execution.completedAt && execution.startedAt
          ? execution.completedAt.getTime() - execution.startedAt.getTime()
          : undefined,
    };

    this.broadcastToExecutionSubscribers(execution.id, 'workflow-failed', {
      ...event,
      error,
    });
    this.logger.error(`Workflow failed: ${execution.id}, error: ${error}`);

    // 清理数据
    this.cleanupExecutionData(execution.id);
  }

  // 监听节点执行开始事件
  @OnEvent('node.execution.started')
  handleNodeExecutionStarted(data: {
    execution: WorkflowExecution;
    node: WorkflowNode;
    input?: any;
  }) {
    if (!this.isEventTypeEnabled('node')) {
      return;
    }

    const { execution, node, input } = data;

    // 记录开始时间（如果启用性能跟踪）
    if (this.isPerformanceTrackingEnabled()) {
      const executionTimes = this.nodeExecutionTimes.get(execution.id);
      if (executionTimes) {
        executionTimes.set(node.id, Date.now());
      }
    }

    const event: NodeExecutionEvent = {
      executionId: execution.id,
      nodeId: node.id,
      nodeType: node.type,
      nodeLabel: node.label || node.type,
      status: 'started',
      timestamp: new Date(),
      input: this.sanitizeData(input),
    };

    this.broadcastToExecutionSubscribers(execution.id, 'node-started', event);
    this.logger.debug(`Node started: ${node.id} in execution ${execution.id}`);
  }

  // 监听节点执行完成事件
  @OnEvent('node.execution.completed')
  handleNodeExecutionCompleted(data: {
    execution: WorkflowExecution;
    node: WorkflowNode;
    output?: any;
    duration?: number;
  }) {
    if (!this.isEventTypeEnabled('node')) {
      return;
    }

    const { execution, node, output } = data;
    let { duration } = data;

    // 计算执行时间（如果启用性能跟踪且没有提供duration）
    if (this.isPerformanceTrackingEnabled() && !duration) {
      const executionTimes = this.nodeExecutionTimes.get(execution.id);
      if (executionTimes && executionTimes.has(node.id)) {
        const startTime = executionTimes.get(node.id)!;
        duration = Date.now() - startTime;
        executionTimes.delete(node.id); // 清理已完成的节点时间记录
      }
    }

    const event: NodeExecutionEvent = {
      executionId: execution.id,
      nodeId: node.id,
      nodeType: node.type,
      nodeLabel: node.label || node.type,
      status: 'completed',
      timestamp: new Date(),
      duration,
      output: this.sanitizeData(output),
    };

    this.broadcastToExecutionSubscribers(execution.id, 'node-completed', event);

    // 检查性能警告（如果启用性能跟踪）
    if (this.isPerformanceTrackingEnabled() && duration) {
      const warningThreshold =
        this.monitoringConfig.performance.warningThresholdMs;
      const criticalThreshold =
        this.monitoringConfig.performance.criticalThresholdMs;

      if (
        duration > criticalThreshold &&
        this.isEventTypeEnabled('performance')
      ) {
        this.broadcastToExecutionSubscribers(
          execution.id,
          'performance-critical',
          {
            executionId: execution.id,
            nodeId: node.id,
            nodeType: node.type,
            duration,
            threshold: criticalThreshold,
            timestamp: new Date(),
            message: `Node ${node.id} execution time (${duration}ms) exceeds critical threshold (${criticalThreshold}ms)`,
          },
        );
      } else if (
        duration > warningThreshold &&
        this.isEventTypeEnabled('performance')
      ) {
        this.broadcastToExecutionSubscribers(
          execution.id,
          'performance-warning',
          {
            executionId: execution.id,
            nodeId: node.id,
            nodeType: node.type,
            duration,
            threshold: warningThreshold,
            timestamp: new Date(),
            message: `Node ${node.id} execution time (${duration}ms) exceeds warning threshold (${warningThreshold}ms)`,
          },
        );
      }
    }

    this.logger.debug(
      `Node completed: ${node.id} in execution ${execution.id}${duration ? ` (${duration}ms)` : ''}`,
    );
  }

  // 监听节点执行失败事件
  @OnEvent('node.execution.failed')
  handleNodeExecutionFailed(data: {
    execution: WorkflowExecution;
    node: WorkflowNode;
    error: string;
    retryAttempt?: number;
    totalRetries?: number;
  }) {
    const { execution, node, error, retryAttempt, totalRetries } = data;
    const endTime = Date.now();

    // 计算执行时间
    const executionTimes = this.nodeExecutionTimes.get(execution.id);
    const startTime = executionTimes?.get(node.id);
    const duration = startTime ? endTime - startTime : undefined;

    const event: NodeExecutionEvent = {
      executionId: execution.id,
      nodeId: node.id,
      nodeType: node.type,
      nodeLabel: node.label,
      status: 'failed',
      timestamp: new Date(endTime),
      duration,
      error,
      metadata: {
        retryAttempt,
        totalRetries,
        memoryUsage: process.memoryUsage().heapUsed,
      },
    };

    this.broadcastToExecutionSubscribers(execution.id, 'node-failed', event);
    this.logger.debug(`Node ${node.id} failed: ${error}`);
  }

  // 监听节点等待事件
  @OnEvent('node.execution.waiting')
  handleNodeExecutionWaiting(data: {
    execution: WorkflowExecution;
    node: WorkflowNode;
    waitingFor: string;
    estimatedWaitTime?: number;
  }) {
    const { execution, node, waitingFor, estimatedWaitTime } = data;

    const event: NodeExecutionEvent = {
      executionId: execution.id,
      nodeId: node.id,
      nodeType: node.type,
      nodeLabel: node.label,
      status: 'waiting',
      timestamp: new Date(),
      metadata: {
        waitingFor,
        estimatedWaitTime,
      },
    };

    this.broadcastToExecutionSubscribers(execution.id, 'node-waiting', event);
    this.logger.debug(`Node ${node.id} waiting for ${waitingFor}`);
  }

  // 私有方法：取消订阅
  private unsubscribeFromExecution(socketId: string, executionId: string) {
    const clientInfo = this.clients.get(socketId);
    if (clientInfo) {
      clientInfo.subscribedExecutions.delete(executionId);
    }

    const subscribers = this.executionSubscribers.get(executionId);
    if (subscribers) {
      subscribers.delete(socketId);
      if (subscribers.size === 0) {
        this.executionSubscribers.delete(executionId);
      }
    }
  }

  // 私有方法：广播给执行订阅者
  private broadcastToExecutionSubscribers(
    executionId: string,
    event: string,
    data: any,
  ) {
    const subscribers = this.executionSubscribers.get(executionId);
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

  // 私有方法：发送当前执行状态
  private async sendCurrentExecutionStatus(
    client: Socket,
    executionId: string,
  ) {
    // 这里可以查询数据库获取当前执行状态
    // 简化实现，实际使用时需要完善
    client.emit('current-status', {
      executionId,
      message: 'Current status will be implemented',
      timestamp: new Date(),
    });
  }

  // 私有方法：计算执行性能
  private calculateExecutionPerformance(
    executionId: string,
  ): WorkflowExecutionEvent['performance'] {
    const executionTimes = this.nodeExecutionTimes.get(executionId);
    if (!executionTimes) {
      return undefined;
    }

    const nodeExecutions: Array<{
      nodeId: string;
      duration: number;
      status: string;
    }> = [];
    const bottlenecks: Array<{
      nodeId: string;
      duration: number;
      reason: string;
    }> = [];

    let totalDuration = 0;
    let maxDuration = 0;
    let slowestNode = '';

    for (const [nodeId, startTime] of executionTimes) {
      const duration = Date.now() - startTime;
      totalDuration += duration;

      nodeExecutions.push({
        nodeId,
        duration,
        status: 'completed', // 简化状态，实际需要跟踪
      });

      if (duration > maxDuration) {
        maxDuration = duration;
        slowestNode = nodeId;
      }

      // 识别瓶颈（执行时间超过5秒的节点）
      if (duration > 5000) {
        bottlenecks.push({
          nodeId,
          duration,
          reason: duration > 30000 ? 'Very slow execution' : 'Slow execution',
        });
      }
    }

    return {
      totalDuration,
      nodeExecutions,
      bottlenecks,
      slowestNode: slowestNode
        ? { nodeId: slowestNode, duration: maxDuration }
        : null,
      averageNodeDuration:
        nodeExecutions.length > 0 ? totalDuration / nodeExecutions.length : 0,
    };
  }

  // 私有方法：清理执行数据
  private cleanupExecutionData(executionId: string) {
    this.nodeExecutionTimes.delete(executionId);
    this.executionSubscribers.delete(executionId);
  }

  // 私有方法：数据清理（移除敏感信息）
  private sanitizeData(data: any): any {
    if (!data) return data;

    // 深拷贝并移除敏感字段
    const sanitized = JSON.parse(JSON.stringify(data));

    // 递归移除敏感字段
    const removeSensitiveFields = (obj: any) => {
      if (typeof obj !== 'object' || obj === null) return;

      const sensitiveFields = [
        'password',
        'token',
        'secret',
        'key',
        'apiKey',
        'authorization',
      ];

      for (const field of sensitiveFields) {
        if (obj[field]) {
          obj[field] = '[REDACTED]';
        }
      }

      for (const key in obj) {
        if (typeof obj[key] === 'object') {
          removeSensitiveFields(obj[key]);
        }
      }
    };

    removeSensitiveFields(sanitized);
    return sanitized;
  }

  // 公共方法：获取连接统计
  getConnectionStats() {
    return {
      totalConnections: this.clients.size,
      activeExecutions: this.executionSubscribers.size,
      totalSubscriptions: Array.from(this.executionSubscribers.values()).reduce(
        (sum, subscribers) => sum + subscribers.size,
        0,
      ),
    };
  }

  // 公共方法：手动触发事件（用于测试）
  emitTestEvent(executionId: string, eventType: string, data: any) {
    this.broadcastToExecutionSubscribers(executionId, eventType, {
      ...data,
      timestamp: new Date(),
      isTest: true,
    });
  }
}
