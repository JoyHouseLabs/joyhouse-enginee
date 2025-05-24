# 工作流监控配置指南

## 🎯 配置策略

工作流监控系统采用 **分层配置策略**，支持灵活的配置管理：

```
环境变量 (.env) > YAML配置文件 (joyhouse.yaml) > 默认值
```

### 配置优先级

1. **环境变量** - 最高优先级，适用于环境特定配置
2. **YAML配置文件** - 中等优先级，适用于基础配置和默认值
3. **代码默认值** - 最低优先级，确保系统可用性

## 📁 配置文件结构

### 1. YAML配置文件 (`joyhouse.yaml`)

```yaml
# 工作流监控配置
monitoring:
  enabled: true
  websocket:
    port: 3000
    namespace: "/workflow-monitor"
    corsOrigin: "*"
  performance:
    trackingEnabled: true
    retentionHours: 24
    warningThresholdMs: 5000
    criticalThresholdMs: 30000
  events:
    enableNodeEvents: true
    enableWorkflowEvents: true
    enablePerformanceEvents: true
```

### 2. 环境变量文件 (`.env`)

```env
# 监控总开关
MONITORING_ENABLED=true

# WebSocket配置
WEBSOCKET_PORT=3000
WEBSOCKET_NAMESPACE=/workflow-monitor
WEBSOCKET_CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# 性能监控配置
PERFORMANCE_TRACKING_ENABLED=true
PERFORMANCE_METRICS_RETENTION_HOURS=24
PERFORMANCE_WARNING_THRESHOLD_MS=5000
PERFORMANCE_CRITICAL_THRESHOLD_MS=30000

# 事件配置
ENABLE_NODE_EVENTS=true
ENABLE_WORKFLOW_EVENTS=true
ENABLE_PERFORMANCE_EVENTS=true
```

## 🔧 配置选项详解

### 监控总开关

| 配置项 | YAML路径 | 环境变量 | 默认值 | 说明 |
|--------|----------|----------|--------|------|
| 启用监控 | `monitoring.enabled` | `MONITORING_ENABLED` | `true` | 控制整个监控系统的开关 |

### WebSocket配置

| 配置项 | YAML路径 | 环境变量 | 默认值 | 说明 |
|--------|----------|----------|--------|------|
| 端口 | `monitoring.websocket.port` | `WEBSOCKET_PORT` | `3000` | WebSocket服务端口 |
| 命名空间 | `monitoring.websocket.namespace` | `WEBSOCKET_NAMESPACE` | `/workflow-monitor` | Socket.IO命名空间 |
| CORS源 | `monitoring.websocket.corsOrigin` | `WEBSOCKET_CORS_ORIGIN` | `*` | 允许的跨域源 |

### 性能监控配置

| 配置项 | YAML路径 | 环境变量 | 默认值 | 说明 |
|--------|----------|----------|--------|------|
| 性能跟踪 | `monitoring.performance.trackingEnabled` | `PERFORMANCE_TRACKING_ENABLED` | `true` | 是否启用性能跟踪 |
| 数据保留 | `monitoring.performance.retentionHours` | `PERFORMANCE_METRICS_RETENTION_HOURS` | `24` | 性能数据保留时间(小时) |
| 警告阈值 | `monitoring.performance.warningThresholdMs` | `PERFORMANCE_WARNING_THRESHOLD_MS` | `5000` | 性能警告阈值(毫秒) |
| 严重阈值 | `monitoring.performance.criticalThresholdMs` | `PERFORMANCE_CRITICAL_THRESHOLD_MS` | `30000` | 性能严重警告阈值(毫秒) |

### 事件配置

| 配置项 | YAML路径 | 环境变量 | 默认值 | 说明 |
|--------|----------|----------|--------|------|
| 节点事件 | `monitoring.events.enableNodeEvents` | `ENABLE_NODE_EVENTS` | `true` | 是否启用节点级事件 |
| 工作流事件 | `monitoring.events.enableWorkflowEvents` | `ENABLE_WORKFLOW_EVENTS` | `true` | 是否启用工作流级事件 |
| 性能事件 | `monitoring.events.enablePerformanceEvents` | `ENABLE_PERFORMANCE_EVENTS` | `true` | 是否启用性能事件 |

## 🌍 环境特定配置

### 开发环境配置

```env
# 开发环境 - 启用所有监控功能
MONITORING_ENABLED=true
PERFORMANCE_TRACKING_ENABLED=true
ENABLE_NODE_EVENTS=true
ENABLE_WORKFLOW_EVENTS=true
ENABLE_PERFORMANCE_EVENTS=true

# 较宽松的性能阈值
PERFORMANCE_WARNING_THRESHOLD_MS=10000
PERFORMANCE_CRITICAL_THRESHOLD_MS=60000

# 允许本地开发
WEBSOCKET_CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000
```

### 测试环境配置

```env
# 测试环境 - 禁用某些监控以提高性能
MONITORING_ENABLED=true
PERFORMANCE_TRACKING_ENABLED=false
ENABLE_NODE_EVENTS=false
ENABLE_WORKFLOW_EVENTS=true
ENABLE_PERFORMANCE_EVENTS=false

# 测试专用端口
WEBSOCKET_PORT=3001
WEBSOCKET_NAMESPACE=/test-workflow-monitor
```

### 生产环境配置

```env
# 生产环境 - 严格的性能监控
MONITORING_ENABLED=true
PERFORMANCE_TRACKING_ENABLED=true
ENABLE_NODE_EVENTS=true
ENABLE_WORKFLOW_EVENTS=true
ENABLE_PERFORMANCE_EVENTS=true

# 严格的性能阈值
PERFORMANCE_WARNING_THRESHOLD_MS=3000
PERFORMANCE_CRITICAL_THRESHOLD_MS=10000

# 生产域名
WEBSOCKET_CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com

# 较短的数据保留时间
PERFORMANCE_METRICS_RETENTION_HOURS=12
```

## 🔄 动态配置更新

### 配置热重载

目前配置在应用启动时加载，如需更新配置：

1. **环境变量更改** - 需要重启应用
2. **YAML文件更改** - 需要重启应用

### 未来增强

计划支持的动态配置功能：

- ✅ 运行时配置更新API
- ✅ 配置变更通知
- ✅ 配置验证和回滚

## 📊 配置验证

### 自动验证

系统启动时会自动验证配置：

```typescript
// 配置验证示例
const config = JoyhouseConfigService.getMonitoringConfig();

// 验证端口范围
if (config.websocket.port < 1024 || config.websocket.port > 65535) {
  throw new Error('Invalid WebSocket port');
}

// 验证阈值逻辑
if (config.performance.warningThresholdMs >= config.performance.criticalThresholdMs) {
  throw new Error('Warning threshold must be less than critical threshold');
}
```

### 配置检查命令

```bash
# 检查当前配置
node -e "
const { JoyhouseConfigService } = require('./dist/common/joyhouse-config');
console.log('Current monitoring config:', JSON.stringify(JoyhouseConfigService.getMonitoringConfig(), null, 2));
"
```

## 🛠️ 配置最佳实践

### 1. 环境隔离

```bash
# 不同环境使用不同的配置文件
cp env.example .env.development
cp env.example .env.production
cp env.example .env.test
```

### 2. 敏感信息管理

```env
# 使用环境变量存储敏感信息
WEBSOCKET_AUTH_SECRET=your-secret-key
MONITORING_API_KEY=your-api-key
```

### 3. 配置文档化

```yaml
# joyhouse.yaml - 在配置文件中添加注释
monitoring:
  enabled: true  # 主开关：控制整个监控系统
  websocket:
    port: 3000   # WebSocket端口：建议使用非标准端口
    namespace: "/workflow-monitor"  # 命名空间：避免与其他Socket.IO服务冲突
```

### 4. 配置测试

```javascript
// 配置测试示例
describe('Monitoring Configuration', () => {
  it('should load default configuration', () => {
    const config = JoyhouseConfigService.getMonitoringConfig();
    expect(config.enabled).toBe(true);
    expect(config.websocket.port).toBe(3000);
  });

  it('should override with environment variables', () => {
    process.env.MONITORING_ENABLED = 'false';
    const config = JoyhouseConfigService.getMonitoringConfig();
    expect(config.enabled).toBe(false);
  });
});
```

## 🚨 故障排除

### 常见配置问题

1. **监控不工作**
   ```bash
   # 检查监控是否启用
   echo $MONITORING_ENABLED
   ```

2. **WebSocket连接失败**
   ```bash
   # 检查端口和CORS配置
   echo $WEBSOCKET_PORT
   echo $WEBSOCKET_CORS_ORIGIN
   ```

3. **性能事件缺失**
   ```bash
   # 检查性能跟踪配置
   echo $PERFORMANCE_TRACKING_ENABLED
   echo $ENABLE_PERFORMANCE_EVENTS
   ```

### 配置调试

```typescript
// 启用配置调试日志
const config = JoyhouseConfigService.loadConfig();
console.log('Full configuration:', JSON.stringify(config, null, 2));
```

## 📚 相关文档

- [快速开始指南](./WORKFLOW_REALTIME_MONITORING_QUICK_START.md)
- [完整API文档](./WORKFLOW_REALTIME_MONITORING_SETUP.md)
- [性能优化指南](./PERFORMANCE_OPTIMIZATION.md)
- [安全配置指南](./SECURITY_CONFIGURATION.md) 