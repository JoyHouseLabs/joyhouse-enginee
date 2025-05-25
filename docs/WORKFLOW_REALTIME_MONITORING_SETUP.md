# 工作流实时监控系统设置指南

## 概述

本文档介绍如何设置和使用工作流实时监控系统，该系统通过WebSocket连接提供节点级别的实时执行状态、性能监控和错误追踪。

## 架构设计

### 1. 技术选择对比

| 技术方案 | 优势 | 劣势 | 适用场景 |
|---------|------|------|----------|
| **WebSocket** ✅ | 双向通信、低延迟、支持房间机制 | 连接管理复杂 | 实时监控、多工作流并发 |
| SSE | 简单、自动重连 | 单向通信、浏览器连接限制 | 简单推送场景 |
| 轮询 | 简单实现 | 高延迟、资源浪费 | 低实时性要求 |

**推荐使用WebSocket**，因为它最适合工作流监控的实时性和双向交互需求。

### 2. 系统架构

```
┌─────────────────┐    WebSocket    ┌──────────────────┐
│   客户端应用     │ ◄──────────────► │  工作流监控网关   │
│                │                 │                 │
│ - 监控面板      │                 │ - 房间管理       │
│ - 性能分析      │                 │ - 事件分发       │
│ - 实时日志      │                 │ - 连接管理       │
└─────────────────┘                 └──────────────────┘
                                            │
                                            ▼
                                   ┌──────────────────┐
                                   │   工作流引擎      │
                                   │                 │
                                   │ - 事件发射       │
                                   │ - 节点执行       │
                                   │ - 性能统计       │
                                   └──────────────────┘
```

## 服务端配置

### 1. 安装依赖

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
npm install @nestjs/event-emitter
```

### 2. 模块配置

在 `app.module.ts` 中添加：

```typescript
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    // ... 其他模块
  ],
  providers: [
    WorkflowRealtimeService,
    // ... 其他服务
  ],
})
export class AppModule {}
```

### 3. 环境变量配置

```env
# WebSocket配置
WEBSOCKET_PORT=3001
WEBSOCKET_CORS_ORIGIN=http://localhost:1666,http://localhost:3001
WEBSOCKET_NAMESPACE=/workflow-monitor

# 性能监控配置
PERFORMANCE_TRACKING_ENABLED=true
PERFORMANCE_METRICS_RETENTION_HOURS=24
PERFORMANCE_WARNING_THRESHOLD_MS=5000
PERFORMANCE_CRITICAL_THRESHOLD_MS=30000
```

## 客户端配置

### 1. 安装依赖

```bash
npm install socket.io-client
```

### 2. 基础连接示例

```typescript
import { WorkflowMonitorClient } from './workflow-monitor-client';

// 创建监控客户端
const monitor = new WorkflowMonitorClient('http://localhost:1666', 'user123');

// 监控特定工作流执行
await monitor.subscribeToExecution('execution-id-123');

// 添加事件监听器
monitor.on('node-completed', (data) => {
  console.log(`Node ${data.nodeId} completed in ${data.duration}ms`);
});
```

### 3. React组件示例

```typescript
import React, { useEffect, useState } from 'react';
import { WorkflowPerformanceMonitor } from './workflow-monitor-client';

interface WorkflowMonitorProps {
  executionId: string;
  userId: string;
}

export const WorkflowMonitorComponent: React.FC<WorkflowMonitorProps> = ({
  executionId,
  userId
}) => {
  const [monitor, setMonitor] = useState<WorkflowPerformanceMonitor | null>(null);
  const [nodeEvents, setNodeEvents] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any>(null);

  useEffect(() => {
    const monitorInstance = new WorkflowPerformanceMonitor(
      'http://localhost:1666',
      userId
    );

    // 监听节点事件
    monitorInstance.client.on('node-started', (data) => {
      setNodeEvents(prev => [...prev, { ...data, type: 'started' }]);
    });

    monitorInstance.client.on('node-completed', (data) => {
      setNodeEvents(prev => [...prev, { ...data, type: 'completed' }]);
    });

    monitorInstance.client.on('workflow-completed', (data) => {
      setPerformance(data.performance);
    });

    // 开始监控
    monitorInstance.monitorExecution(executionId);
    setMonitor(monitorInstance);

    return () => {
      monitorInstance.disconnect();
    };
  }, [executionId, userId]);

  return (
    <div className="workflow-monitor">
      <h3>工作流执行监控</h3>
      
      {/* 实时事件日志 */}
      <div className="event-log">
        <h4>实时事件</h4>
        {nodeEvents.map((event, index) => (
          <div key={index} className={`event event-${event.type}`}>
            <span className="timestamp">{new Date(event.timestamp).toLocaleTimeString()}</span>
            <span className="node-id">{event.nodeId}</span>
            <span className="node-type">{event.nodeType}</span>
            <span className="status">{event.type}</span>
            {event.duration && <span className="duration">{event.duration}ms</span>}
          </div>
        ))}
      </div>

      {/* 性能统计 */}
      {performance && (
        <div className="performance-stats">
          <h4>性能统计</h4>
          <div>总执行时间: {performance.totalDuration}ms</div>
          <div>平均节点时间: {performance.averageNodeDuration}ms</div>
          <div>最慢节点: {performance.slowestNode?.nodeId} ({performance.slowestNode?.duration}ms)</div>
        </div>
      )}
    </div>
  );
};
```

## 事件类型说明

### 1. 工作流级别事件

| 事件名称 | 触发时机 | 数据结构 |
|---------|----------|----------|
| `workflow-started` | 工作流开始执行 | `{ executionId, workflowId, workflowName, timestamp }` |
| `workflow-completed` | 工作流完成 | `{ executionId, duration, performance }` |
| `workflow-failed` | 工作流失败 | `{ executionId, error, duration }` |
| `workflow-paused` | 工作流暂停 | `{ executionId, reason }` |

### 2. 节点级别事件

| 事件名称 | 触发时机 | 数据结构 |
|---------|----------|----------|
| `node-started` | 节点开始执行 | `{ executionId, nodeId, nodeType, nodeLabel, input }` |
| `node-completed` | 节点执行完成 | `{ executionId, nodeId, output, duration }` |
| `node-failed` | 节点执行失败 | `{ executionId, nodeId, error, duration }` |
| `node-waiting` | 节点等待状态 | `{ executionId, nodeId, waitingFor, estimatedTime }` |

### 3. 性能监控事件

| 事件名称 | 触发时机 | 数据结构 |
|---------|----------|----------|
| `execution-performance` | 性能数据更新 | `{ executionId, performance }` |
| `performance-warning` | 性能警告 | `{ executionId, nodeId, threshold, actual }` |
| `performance-critical` | 性能严重警告 | `{ executionId, nodeId, threshold, actual }` |

## 房间机制和订阅管理

### 1. 房间命名规则

```typescript
// 执行级别房间
const executionRoom = `execution:${executionId}`;

// 用户级别房间
const userRoom = `user:${userId}`;

// 工作流级别房间
const workflowRoom = `workflow:${workflowId}`;
```

### 2. 订阅管理

```typescript
// 订阅特定执行
socket.emit('subscribe-execution', { executionId: 'exec-123' });

// 订阅用户的所有执行
socket.emit('subscribe-user-executions', { userId: 'user-456' });

// 订阅工作流的所有执行
socket.emit('subscribe-workflow-executions', { workflowId: 'workflow-789' });
```

### 3. 批量订阅

```typescript
// 批量订阅多个执行
socket.emit('subscribe-multiple-executions', { 
  executionIds: ['exec-1', 'exec-2', 'exec-3'] 
});
```

## 性能优化建议

### 1. 连接管理

```typescript
// 连接池配置
const connectionPool = {
  maxConnections: 1000,
  connectionTimeout: 30000,
  heartbeatInterval: 25000,
  maxReconnectAttempts: 5
};

// 自动清理非活跃连接
setInterval(() => {
  cleanupInactiveConnections();
}, 60000);
```

### 2. 事件过滤

```typescript
// 客户端事件过滤
monitor.subscribeToExecution('exec-123', {
  eventTypes: ['node-completed', 'node-failed'], // 只订阅特定事件
  nodeTypes: ['llm', 'tool'], // 只监控特定类型节点
  performanceOnly: true // 只接收性能数据
});
```

### 3. 数据压缩

```typescript
// 启用数据压缩
const socket = io(serverUrl, {
  compression: true,
  forceNew: true,
  transports: ['websocket']
});
```

## 监控面板示例

### 1. 实时监控面板

```typescript
export class WorkflowDashboard {
  private monitors = new Map<string, WorkflowPerformanceMonitor>();
  
  // 添加工作流监控
  async addWorkflowMonitor(executionId: string) {
    const monitor = new WorkflowPerformanceMonitor(
      'http://localhost:1666',
      this.userId
    );
    
    await monitor.monitorExecution(executionId);
    this.monitors.set(executionId, monitor);
    
    // 更新UI
    this.updateDashboard();
  }
  
  // 移除工作流监控
  async removeWorkflowMonitor(executionId: string) {
    const monitor = this.monitors.get(executionId);
    if (monitor) {
      await monitor.stopMonitoring(executionId);
      monitor.disconnect();
      this.monitors.delete(executionId);
    }
  }
  
  // 获取所有监控的性能数据
  async getAllPerformanceData() {
    const performanceData = new Map();
    
    for (const [executionId, monitor] of this.monitors) {
      const data = await monitor.getPerformanceData(executionId);
      performanceData.set(executionId, data);
    }
    
    return performanceData;
  }
}
```

### 2. 性能分析工具

```typescript
export class PerformanceAnalyzer {
  // 分析节点性能瓶颈
  analyzeBottlenecks(performanceData: any) {
    const bottlenecks = [];
    
    for (const [nodeId, metrics] of Object.entries(performanceData.nodeMetrics)) {
      if (metrics.duration > 5000) {
        bottlenecks.push({
          nodeId,
          duration: metrics.duration,
          severity: metrics.duration > 30000 ? 'critical' : 'warning'
        });
      }
    }
    
    return bottlenecks.sort((a, b) => b.duration - a.duration);
  }
  
  // 生成性能报告
  generateReport(executionId: string, performanceData: any) {
    return {
      executionId,
      totalDuration: performanceData.totalDuration,
      nodeCount: Object.keys(performanceData.nodeMetrics).length,
      averageDuration: performanceData.averageNodeDuration,
      bottlenecks: this.analyzeBottlenecks(performanceData),
      recommendations: this.generateRecommendations(performanceData)
    };
  }
}
```

## 故障排除

### 1. 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 连接失败 | 端口被占用或防火墙阻止 | 检查端口配置和防火墙设置 |
| 事件丢失 | 网络不稳定或缓冲区溢出 | 启用事件确认机制 |
| 性能下降 | 订阅过多或事件频率过高 | 实施事件过滤和限流 |
| 内存泄漏 | 连接未正确清理 | 实施连接生命周期管理 |

### 2. 调试工具

```typescript
// 启用调试模式
const monitor = new WorkflowPerformanceMonitor('http://localhost:1666', 'user123');
monitor.enableDebugMode();

// 监控连接状态
monitor.on('connection-status', (status) => {
  console.log('Connection status:', status);
});

// 监控事件统计
monitor.on('event-stats', (stats) => {
  console.log('Event statistics:', stats);
});
```

## 安全考虑

### 1. 身份验证

```typescript
// JWT令牌验证
const socket = io(serverUrl, {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### 2. 权限控制

```typescript
// 基于角色的访问控制
@SubscribeMessage('subscribe-execution')
async handleSubscription(client: Socket, data: { executionId: string }) {
  const user = await this.authService.validateUser(client.handshake.auth.token);
  const hasPermission = await this.permissionService.canMonitorExecution(
    user.id, 
    data.executionId
  );
  
  if (!hasPermission) {
    client.emit('error', { message: 'Permission denied' });
    return;
  }
  
  // 继续订阅逻辑...
}
```

## 总结

通过WebSocket实现的工作流实时监控系统提供了：

✅ **实时性能监控** - 节点级别的执行时间统计
✅ **多工作流支持** - 同时监控多个工作流执行
✅ **智能房间管理** - 基于执行ID的订阅机制
✅ **性能瓶颈识别** - 自动检测和报告慢节点
✅ **可扩展架构** - 支持自定义事件和监控策略
✅ **完整的客户端SDK** - 开箱即用的监控工具

这个方案比SSE更适合工作流监控场景，因为它支持双向通信、房间机制和更好的连接管理。 