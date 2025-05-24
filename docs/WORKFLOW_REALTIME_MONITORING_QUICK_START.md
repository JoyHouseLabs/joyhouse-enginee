# 工作流实时监控系统 - 快速开始指南

## 🚀 概述

工作流实时监控系统提供了对工作流执行过程的实时监控能力，支持：

- ✅ **实时节点监控** - 监控每个节点的输入、输出和执行时间
- ✅ **性能分析** - 自动检测性能瓶颈和优化建议
- ✅ **多工作流并发** - 同时监控多个工作流执行
- ✅ **WebSocket连接** - 低延迟的实时数据推送
- ✅ **智能房间机制** - 基于执行ID的订阅管理

## 📦 安装依赖

```bash
# 安装服务端依赖（已包含在项目中）
pnpm install

# 客户端需要安装 socket.io-client
pnpm add socket.io-client
```

## 🔧 配置

### 1. 环境变量

在 `.env` 文件中添加：

```env
# WebSocket配置
WEBSOCKET_PORT=3000
WEBSOCKET_CORS_ORIGIN=*

# 监控配置
MONITORING_ENABLED=true
MONITORING_PERFORMANCE_THRESHOLD_WARNING=5000
MONITORING_PERFORMANCE_THRESHOLD_CRITICAL=30000
```

### 2. 服务器配置

工作流监控服务已自动集成到 `WorkflowModule` 中，无需额外配置。

## 🚀 快速开始

### 1. 启动服务器

```bash
# 开发模式
pnpm run start:dev

# 生产模式
pnpm run build
pnpm run start:prod
```

### 2. 基础监控客户端

```javascript
const { io } = require('socket.io-client');

// 连接到监控服务
const socket = io('http://localhost:3000/workflow-monitor', {
  auth: {
    userId: 'your-user-id'
  }
});

// 监听工作流事件
socket.on('workflow-started', (data) => {
  console.log('工作流开始:', data.executionId);
});

socket.on('node-completed', (data) => {
  console.log(`节点完成: ${data.nodeId}, 耗时: ${data.duration}ms`);
});

// 订阅特定执行
socket.emit('subscribe-execution', { 
  executionId: 'your-execution-id' 
});
```

### 3. 高级性能监控

```javascript
const { WorkflowPerformanceMonitor } = require('./examples/workflow-monitor-client');

const monitor = new WorkflowPerformanceMonitor('http://localhost:3000');

// 连接并开始监控
await monitor.connect('user-123');
await monitor.subscribeToExecution('execution-456');

// 获取性能报告
const report = monitor.getPerformanceReport();
console.log('性能报告:', report);
```

## 📊 监控事件类型

### 工作流级别事件

| 事件名称 | 描述 | 数据结构 |
|---------|------|----------|
| `workflow-started` | 工作流开始执行 | `{ executionId, workflowId, timestamp }` |
| `workflow-completed` | 工作流执行完成 | `{ executionId, duration, performance }` |
| `workflow-failed` | 工作流执行失败 | `{ executionId, error, timestamp }` |
| `workflow-paused` | 工作流暂停 | `{ executionId, reason, timestamp }` |

### 节点级别事件

| 事件名称 | 描述 | 数据结构 |
|---------|------|----------|
| `node-started` | 节点开始执行 | `{ executionId, nodeId, nodeType, input }` |
| `node-completed` | 节点执行完成 | `{ executionId, nodeId, output, duration }` |
| `node-failed` | 节点执行失败 | `{ executionId, nodeId, error, duration }` |
| `node-waiting` | 节点等待状态 | `{ executionId, nodeId, waitingFor }` |

### 性能监控事件

| 事件名称 | 描述 | 数据结构 |
|---------|------|----------|
| `execution-performance` | 执行性能数据 | `{ executionId, performance, bottlenecks }` |
| `performance-warning` | 性能警告 | `{ executionId, nodeId, duration, threshold }` |
| `performance-critical` | 性能严重警告 | `{ executionId, nodeId, duration, threshold }` |

## 🔧 客户端API

### 基础连接

```javascript
// 连接到监控服务
const socket = io('http://localhost:3000/workflow-monitor', {
  auth: { userId: 'user-id' },
  transports: ['websocket', 'polling']
});
```

### 订阅管理

```javascript
// 订阅单个执行
socket.emit('subscribe-execution', { executionId: 'exec-123' });

// 订阅用户的所有执行
socket.emit('subscribe-user-executions', { userId: 'user-456' });

// 订阅工作流的所有执行
socket.emit('subscribe-workflow-executions', { workflowId: 'workflow-789' });

// 批量订阅
socket.emit('subscribe-batch', { 
  executionIds: ['exec-1', 'exec-2', 'exec-3'] 
});
```

### 性能数据获取

```javascript
// 获取执行性能数据
socket.emit('get-execution-performance', { executionId: 'exec-123' });

// 监听性能数据
socket.on('execution-performance', (data) => {
  console.log('性能数据:', data.performance);
});
```

## 🧪 测试

### 运行完整测试套件

```bash
# 运行自动化测试脚本
./scripts/test-monitoring-system.sh
```

### 手动测试

```bash
# 启动服务器
pnpm run start:dev

# 在另一个终端运行测试
node test-realtime-monitoring.js
```

## 📈 性能优化

### 1. 连接池管理

```javascript
// 限制并发连接数
const maxConnections = 1000;
const connectionPool = new Map();
```

### 2. 事件过滤

```javascript
// 只订阅关心的事件
socket.emit('subscribe-execution', { 
  executionId: 'exec-123',
  events: ['node-completed', 'workflow-completed']
});
```

### 3. 批量处理

```javascript
// 批量获取性能数据
socket.emit('get-batch-performance', { 
  executionIds: ['exec-1', 'exec-2', 'exec-3'] 
});
```

## 🔒 安全考虑

### 1. 身份验证

```javascript
// JWT令牌认证
const socket = io('http://localhost:3000/workflow-monitor', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### 2. 权限控制

```javascript
// 基于角色的访问控制
socket.emit('subscribe-execution', { 
  executionId: 'exec-123',
  role: 'admin' // 或 'user', 'viewer'
});
```

## 🐛 故障排除

### 常见问题

1. **连接失败**
   - 检查服务器是否运行在正确端口
   - 验证CORS配置
   - 检查防火墙设置

2. **事件丢失**
   - 检查订阅是否成功
   - 验证房间机制配置
   - 查看服务器日志

3. **性能问题**
   - 减少订阅的执行数量
   - 使用事件过滤
   - 检查网络延迟

### 调试模式

```javascript
// 启用调试日志
const socket = io('http://localhost:3000/workflow-monitor', {
  auth: { userId: 'user-id' },
  forceNew: true,
  debug: true
});
```

## 📚 更多资源

- [完整API文档](./WORKFLOW_REALTIME_MONITORING_SETUP.md)
- [性能优化指南](./PERFORMANCE_OPTIMIZATION.md)
- [安全配置指南](./SECURITY_CONFIGURATION.md)
- [故障排除指南](./TROUBLESHOOTING.md)

## 🤝 贡献

欢迎提交Issue和Pull Request来改进监控系统！

## �� 许可证

MIT License 