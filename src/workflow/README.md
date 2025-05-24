# Workflow 模块

这是一个强大的工作流执行引擎，支持可视化编辑、多种节点类型、事件驱动和用户交互。

## 功能特性

### 🎯 核心功能
- **可视化工作流设计**: 支持节点和边的可视化编辑
- **多种节点类型**: 工具调用、AI Agent、条件判断、用户输入、事件等待、审批等
- **事件驱动**: 支持外部事件触发工作流继续执行
- **用户交互**: 支持暂停等待用户输入或审批
- **模板系统**: 预定义工作流模板，快速创建常用流程
- **执行监控**: 详细的执行日志和状态跟踪

### 📊 节点类型

| 节点类型 | 描述 | 用途 |
|---------|------|------|
| `start` | 开始节点 | 工作流入口点 |
| `end` | 结束节点 | 工作流出口点 |
| `tool` | 工具节点 | 调用外部工具API |
| `agent` | AI代理节点 | 调用AI Agent进行对话 |
| `condition` | 条件节点 | 根据条件分支执行 |
| `user_input` | 用户输入节点 | 暂停等待用户输入 |
| `wait_event` | 事件等待节点 | 等待外部事件触发 |
| `approval` | 审批节点 | 等待指定用户审批 |
| `script` | 脚本节点 | 执行自定义JavaScript代码 |
| `delay` | 延迟节点 | 延迟指定时间后继续 |
| `loop_start` | 循环开始节点 | 标记循环的开始位置 |
| `loop_end` | 循环结束节点 | 检查退出条件并决定是否继续循环 |
| `loop_condition` | 循环条件节点 | 评估循环继续条件 |
| `parallel_start` | 并发开始节点 | 启动并发执行多个分支 |
| `parallel_end` | 并发结束节点 | 等待并发分支完成并汇总结果 |
| `parallel_branch` | 并发分支节点 | 并发执行的具体分支任务 |

## API 接口

### 工作流管理

```typescript
// 创建工作流
POST /workflows
{
  "name": "我的工作流",
  "description": "工作流描述",
  "nodes": [...],
  "edges": [...],
  "variables": {...}
}

// 获取所有工作流
GET /workflows

// 获取指定工作流
GET /workflows/:id

// 更新工作流
PATCH /workflows/:id

// 删除工作流
DELETE /workflows/:id

// 发布工作流
POST /workflows/:id/publish

// 验证工作流
GET /workflows/:id/validate
```

### 工作流执行

```typescript
// 执行工作流
POST /workflows/:id/execute
{
  "input": {
    "location": "Beijing",
    "keywords": ["AI", "技术"]
  },
  "triggerType": "manual"
}

// 获取执行历史
GET /workflows/:id/executions

// 获取执行详情
GET /workflows/executions/:executionId

// 获取执行步骤
GET /workflows/executions/:executionId/steps

// 继续执行（用户输入）
POST /workflows/executions/:executionId/continue
{
  "input": {
    "satisfaction": 9,
    "feedback": "很好"
  }
}

// 审批工作流
POST /workflows/executions/:executionId/approve
{
  "approved": true,
  "comment": "同意继续"
}

// 取消执行
POST /workflows/executions/:executionId/cancel
```

### 事件触发

```typescript
// 手动触发事件
POST /workflow-events/trigger
{
  "eventType": "btc_price_change",
  "eventData": {
    "price": 75000,
    "timestamp": "2024-01-01T00:00:00Z"
  }
}

// 触发BTC价格事件
POST /workflow-events/btc-price
{
  "price": 75000
}

// 触发天气事件
POST /workflow-events/weather
{
  "location": "Beijing",
  "temperature": 25,
  "condition": "sunny"
}

// 触发热点新闻事件
POST /workflow-events/trending-news
{
  "keywords": ["AI", "区块链", "元宇宙"],
  "articles": [...]
}
```

## 使用示例

### 1. 创建简单工作流

```typescript
const simpleWorkflow = {
  name: "简单示例",
  nodes: [
    {
      id: "start",
      type: "start",
      label: "开始",
      position: { x: 100, y: 100 },
      data: {}
    },
    {
      id: "get-weather",
      type: "tool",
      label: "获取天气",
      position: { x: 300, y: 100 },
      data: {
        toolId: "weather-tool-id",
        location: "{{location}}"
      }
    },
    {
      id: "end",
      type: "end",
      label: "结束",
      position: { x: 500, y: 100 },
      data: {}
    }
  ],
  edges: [
    {
      id: "start-to-weather",
      source: "start",
      target: "get-weather"
    },
    {
      id: "weather-to-end",
      source: "get-weather",
      target: "end"
    }
  ],
  variables: {
    location: "Beijing"
  }
};
```

### 2. 条件分支工作流

```typescript
const conditionalWorkflow = {
  name: "条件分支示例",
  nodes: [
    {
      id: "start",
      type: "start",
      label: "开始",
      position: { x: 100, y: 100 },
      data: {}
    },
    {
      id: "check-weather",
      type: "condition",
      label: "检查天气",
      position: { x: 300, y: 100 },
      data: {
        condition: "temperature > 25"
      }
    },
    {
      id: "hot-weather",
      type: "agent",
      label: "热天建议",
      position: { x: 500, y: 50 },
      data: {
        agentId: "weather-agent-id",
        message: "今天很热，给我一些降温建议"
      }
    },
    {
      id: "cold-weather",
      type: "agent",
      label: "冷天建议",
      position: { x: 500, y: 150 },
      data: {
        agentId: "weather-agent-id",
        message: "今天很冷，给我一些保暖建议"
      }
    }
  ],
  edges: [
    {
      id: "start-to-check",
      source: "start",
      target: "check-weather"
    },
    {
      id: "hot-branch",
      source: "check-weather",
      target: "hot-weather",
      condition: "temperature > 25"
    },
    {
      id: "cold-branch",
      source: "check-weather",
      target: "cold-weather",
      condition: "temperature <= 25"
    }
  ]
};
```

### 3. 用户交互工作流

```typescript
const interactiveWorkflow = {
  name: "用户交互示例",
  nodes: [
    {
      id: "start",
      type: "start",
      label: "开始",
      position: { x: 100, y: 100 },
      data: {}
    },
    {
      id: "user-input",
      type: "user_input",
      label: "用户输入",
      position: { x: 300, y: 100 },
      data: {
        prompt: "请输入您的需求",
        timeout: 300000
      }
    },
    {
      id: "approval",
      type: "approval",
      label: "管理员审批",
      position: { x: 500, y: 100 },
      data: {
        approvers: ["admin-user-id"],
        prompt: "请审批用户请求"
      }
    },
    {
      id: "process-request",
      type: "agent",
      label: "处理请求",
      position: { x: 700, y: 100 },
      data: {
        agentId: "assistant-agent-id",
        message: "根据用户需求：{{userInput}}，请提供解决方案"
      }
    }
  ]
};
```

### 4. 事件驱动工作流

```typescript
const eventDrivenWorkflow = {
  name: "事件驱动示例",
  nodes: [
    {
      id: "start",
      type: "start",
      label: "开始",
      position: { x: 100, y: 100 },
      data: {}
    },
    {
      id: "wait-btc-price",
      type: "wait_event",
      label: "等待BTC价格",
      position: { x: 300, y: 100 },
      data: {
        eventType: "btc_price_change",
        eventCondition: "eventData.price < 80000"
      }
    },
    {
      id: "send-alert",
      type: "agent",
      label: "发送提醒",
      position: { x: 500, y: 100 },
      data: {
        agentId: "notification-agent-id",
        message: "BTC价格已降至 ${{eventData.price}}，请注意！"
      }
    }
  ]
};
```

### 5. 循环工作流

循环工作流支持重复执行一系列节点，直到满足退出条件。支持多种退出方式：
- 最大迭代次数限制
- 条件表达式退出
- 用户输入特定关键词退出
- 外部事件触发退出

#### 简单循环示例

```typescript
const simpleLoopWorkflow = {
  name: "简单计数循环",
  description: "从1数到10的简单循环",
  nodes: [
    {
      id: "start",
      type: "start",
      label: "开始",
      position: { x: 100, y: 100 },
      data: {}
    },
    {
      id: "init-counter",
      type: "script",
      label: "初始化计数器",
      position: { x: 300, y: 100 },
      data: {
        script: "return { counter: 0 };"
      }
    },
    {
      id: "loop-start",
      type: "loop_start",
      label: "循环开始",
      position: { x: 500, y: 100 },
      data: {
        loopId: "counter-loop",
        maxIterations: 10,
        exitCondition: "counter >= 10"
      }
    },
    {
      id: "increment",
      type: "script",
      label: "递增计数器",
      position: { x: 700, y: 100 },
      data: {
        script: `
          const currentCounter = context.counter || 0;
          const newCounter = currentCounter + 1;
          console.log(\`计数: \${newCounter}\`);
          return { counter: newCounter };
        `
      }
    },
    {
      id: "loop-end",
      type: "loop_end",
      label: "循环结束",
      position: { x: 900, y: 100 },
      data: {
        loopId: "counter-loop"
      }
    },
    {
      id: "end",
      type: "end",
      label: "结束",
      position: { x: 1100, y: 100 },
      data: {}
    }
  ],
  edges: [
    { source: "start", target: "init-counter" },
    { source: "init-counter", target: "loop-start" },
    { source: "loop-start", target: "increment" },
    { source: "increment", target: "loop-end" },
    { 
      source: "loop-end", 
      target: "end", 
      condition: "loopExited === true" 
    }
  ]
};
```

#### 监控循环示例

```typescript
const monitoringLoopWorkflow = {
  name: "持续监控工作流",
  description: "持续监控直到用户输入'stop'或BTC价格超过10万",
  nodes: [
    {
      id: "start",
      type: "start",
      label: "开始",
      position: { x: 100, y: 100 },
      data: {}
    },
    {
      id: "loop-start",
      type: "loop_start",
      label: "开始监控循环",
      position: { x: 300, y: 100 },
      data: {
        loopId: "monitoring-loop",
        maxIterations: 1000,
        exitKeyword: "stop",
        exitEventType: "btc_price_change",
        exitEventCondition: "eventData.price > 100000"
      }
    },
    {
      id: "get-btc-price",
      type: "tool",
      label: "获取BTC价格",
      position: { x: 500, y: 100 },
      data: {
        toolId: "btc-price-tool-id"
      }
    },
    {
      id: "check-price",
      type: "script",
      label: "检查价格",
      position: { x: 700, y: 100 },
      data: {
        script: `
          const price = context.toolResult?.price || 0;
          console.log(\`当前BTC价格: $\${price}\`);
          return { btcPrice: price };
        `
      }
    },
    {
      id: "wait-user-input",
      type: "user_input",
      label: "等待用户指令",
      position: { x: 900, y: 100 },
      data: {
        prompt: "监控中... 输入'stop'停止，或其他内容继续",
        timeout: 30000
      }
    },
    {
      id: "delay",
      type: "delay",
      label: "等待间隔",
      position: { x: 1100, y: 100 },
      data: {
        delayMs: 60000 // 1分钟间隔
      }
    },
    {
      id: "loop-end",
      type: "loop_end",
      label: "检查退出条件",
      position: { x: 1300, y: 100 },
      data: {
        loopId: "monitoring-loop"
      }
    },
    {
      id: "end",
      type: "end",
      label: "结束",
      position: { x: 1500, y: 100 },
      data: {}
    }
  ],
  edges: [
    { source: "start", target: "loop-start" },
    { source: "loop-start", target: "get-btc-price" },
    { source: "get-btc-price", target: "check-price" },
    { source: "check-price", target: "wait-user-input" },
    { source: "wait-user-input", target: "delay" },
    { source: "delay", target: "loop-end" },
    { 
      source: "loop-end", 
      target: "end", 
      condition: "loopExited === true" 
    }
  ]
};
```

#### 循环节点配置说明

**loop_start 节点配置：**
```typescript
{
  type: "loop_start",
  data: {
    loopId: "unique-loop-id",        // 必需：循环唯一标识
    maxIterations: 100,              // 可选：最大迭代次数，默认100
    exitCondition: "counter >= 10",  // 可选：退出条件表达式
    exitKeyword: "stop",             // 可选：用户输入退出关键词
    exitEventType: "btc_price_change", // 可选：退出事件类型
    exitEventCondition: "eventData.price > 100000" // 可选：退出事件条件
  }
}
```

**loop_end 节点配置：**
```typescript
{
  type: "loop_end",
  data: {
    loopId: "unique-loop-id"  // 必需：对应的循环标识
  }
}
```

**loop_condition 节点配置：**
```typescript
{
  type: "loop_condition",
  data: {
    loopId: "unique-loop-id",                    // 必需：循环标识
    condition: "currentIteration < maxIterations" // 可选：循环继续条件
  }
}
```

#### 循环退出方式

1. **最大迭代次数退出**
   ```typescript
   data: {
     maxIterations: 50  // 循环50次后自动退出
   }
   ```

2. **条件表达式退出**
   ```typescript
   data: {
     exitCondition: "counter >= 100 || error === true"
   }
   ```

3. **用户输入关键词退出**
   ```typescript
   data: {
     exitKeyword: "stop"  // 用户输入包含"stop"时退出
   }
   ```

4. **外部事件退出**
   ```typescript
   data: {
     exitEventType: "btc_price_change",
     exitEventCondition: "eventData.price > 100000"
   }
   ```

#### 循环中的变量访问

在循环内的脚本节点中，可以访问循环相关的变量：

```typescript
{
  type: "script",
  data: {
    script: `
      // 访问循环状态
      const currentIteration = context.currentIteration;
      const maxIterations = context.maxIterations;
      const loopId = context.loops?.['my-loop']?.loopId;
      
      // 检查是否应该退出
      if (currentIteration >= 10) {
        return { shouldExit: true };
      }
      
      return { 
        message: \`第 \${currentIteration} 次循环\`,
        progress: currentIteration / maxIterations 
      };
    `
  }
}
```

### 6. 并发工作流

并发工作流支持同时执行多个任务分支，等待所有或部分分支完成后汇总结果。这对于需要从多个数据源获取信息的场景非常有用。

#### 并发执行策略

**等待策略：**
- `wait_all`: 等待所有分支完成（默认）
- `wait_any`: 等待任意一个分支完成
- `wait_first`: 等待第一个完成的分支（成功或失败）

**失败处理策略：**
- `fail_fast`: 任一分支失败立即终止（默认）
- `continue_on_error`: 忽略失败分支，继续等待其他分支
- `ignore_errors`: 忽略所有错误，只处理成功的分支

#### 基础并发示例

```typescript
const parallelDataFetchWorkflow = {
  name: "并发数据获取",
  description: "同时从多个API获取数据",
  nodes: [
    {
      id: "start",
      type: "start",
      label: "开始",
      position: { x: 100, y: 200 },
      data: {}
    },
    {
      id: "parallel-start",
      type: "parallel_start",
      label: "开始并发获取",
      position: { x: 300, y: 200 },
      data: {
        parallelId: "data-fetch",
        parallelStrategy: "wait_all",
        parallelTimeout: 30000,
        failureStrategy: "continue_on_error"
      }
    },
    {
      id: "fetch-weather",
      type: "parallel_branch",
      label: "获取天气",
      position: { x: 500, y: 100 },
      data: {
        parallelId: "data-fetch",
        branchName: "weather",
        toolId: "weather-tool-id",
        location: "{{location}}"
      }
    },
    {
      id: "fetch-btc-price",
      type: "parallel_branch",
      label: "获取BTC价格",
      position: { x: 500, y: 200 },
      data: {
        parallelId: "data-fetch",
        branchName: "btcPrice",
        toolId: "btc-price-tool-id"
      }
    },
    {
      id: "parallel-end",
      type: "parallel_end",
      label: "汇总数据",
      position: { x: 700, y: 200 },
      data: {
        parallelId: "data-fetch",
        aggregationScript: `
          // 汇总所有分支的结果
          const weatherData = results.weather?.toolResult || {};
          const btcData = results.btcPrice?.toolResult || {};
          
          return {
            aggregatedData: {
              weather: weatherData,
              crypto: btcData,
              timestamp: new Date().toISOString()
            }
          };
        `
      }
    },
    {
      id: "end",
      type: "end",
      label: "结束",
      position: { x: 900, y: 200 },
      data: {}
    }
  ],
  edges: [
    { source: "start", target: "parallel-start" },
    { source: "parallel-start", target: "fetch-weather" },
    { source: "parallel-start", target: "fetch-btc-price" },
    { source: "fetch-weather", target: "parallel-end" },
    { source: "fetch-btc-price", target: "parallel-end" },
    { source: "parallel-end", target: "end" }
  ]
};
```

#### 并发节点配置说明

**parallel_start 节点配置：**
```typescript
{
  type: "parallel_start",
  data: {
    parallelId: "unique-parallel-id",           // 必需：并发组唯一标识
    parallelStrategy: "wait_all",               // 可选：等待策略
    parallelTimeout: 30000,                     // 可选：超时时间（毫秒）
    failureStrategy: "fail_fast"                // 可选：失败处理策略
  }
}
```

**parallel_branch 节点配置：**
```typescript
{
  type: "parallel_branch",
  data: {
    parallelId: "unique-parallel-id",           // 必需：对应的并发组标识
    branchName: "branch-name",                  // 必需：分支名称，用于结果汇总
    toolId: "tool-id",                          // 工具节点：工具ID
    agentId: "agent-id",                        // 代理节点：代理ID
    script: "return { result: 'data' };"       // 脚本节点：执行脚本
  }
}
```

**parallel_end 节点配置：**
```typescript
{
  type: "parallel_end",
  data: {
    parallelId: "unique-parallel-id",           // 必需：对应的并发组标识
    aggregationScript: `                        // 可选：数据汇总脚本
      // results 包含所有分支的结果
      // context 包含执行上下文
      return {
        combinedData: Object.values(results),
        totalBranches: Object.keys(results).length
      };
    `
  }
}
```

#### 并发执行最佳实践

1. **合理设置超时时间**
   ```typescript
   parallelTimeout: 30000  // 30秒，根据实际API响应时间调整
   ```

2. **选择合适的等待策略**
   - 数据聚合场景：使用 `wait_all`
   - 快速响应场景：使用 `wait_first`
   - 备份数据源：使用 `wait_any`

3. **处理失败情况**
   ```typescript
   failureStrategy: "continue_on_error",  // 允许部分失败
   aggregationScript: `
     // 检查数据完整性
     const hasWeather = results.weather && !results.weather.error;
     const hasPrice = results.btcPrice && !results.btcPrice.error;
     
     if (!hasWeather && !hasPrice) {
       throw new Error('All critical data sources failed');
     }
     
     return { 
       data: results,
       dataQuality: { hasWeather, hasPrice }
     };
   `
   ```

## 变量系统

工作流支持变量系统，可以在节点间传递数据：

```typescript
// 在节点中使用变量
{
  "data": {
    "message": "当前温度是 {{temperature}}°C，天气 {{condition}}"
  }
}

// 脚本节点中访问上下文
{
  "data": {
    "script": `
      const temp = context.temperature;
      const condition = context.condition;
      return { 
        recommendation: temp > 25 ? '建议穿短袖' : '建议穿长袖' 
      };
    `
  }
}
```

## 事件系统

支持多种事件类型：

- `btc_price_change`: BTC价格变化
- `weather_update`: 天气更新
- `trending_news`: 热点新闻
- `user_action`: 用户行为
- `system_alert`: 系统告警
- `webhook`: Webhook事件
- `schedule`: 定时任务

## 最佳实践

### 1. 工作流设计原则
- 保持节点功能单一
- 合理使用条件分支
- 添加适当的错误处理
- 设置合理的超时时间

### 2. 性能优化
- 避免过长的工作流链
- 合理使用并行执行
- 及时清理执行历史

### 3. 安全考虑
- 验证用户权限
- 限制脚本执行权限
- 审计敏感操作

## 故障排除

### 常见问题

1. **工作流执行失败**
   - 检查节点配置是否正确
   - 验证工具ID和Agent ID是否存在
   - 查看执行日志获取详细错误信息

2. **事件未触发**
   - 确认事件类型和条件设置正确
   - 检查事件监听器是否正常运行

3. **用户输入超时**
   - 调整超时时间设置
   - 添加超时处理逻辑

### 调试技巧

```typescript
// 查看执行步骤
GET /workflows/executions/:executionId/steps

// 检查工作流验证
GET /workflows/:id/validate

// 查看执行上下文
GET /workflows/executions/:executionId
```

## 扩展开发

### 添加新节点类型

1. 在 `WorkflowNode` 接口中添加新类型
2. 在 `WorkflowEngineService` 中实现执行逻辑
3. 添加相应的验证规则

### 添加新事件类型

1. 在 `WorkflowEventService` 中添加事件处理器
2. 在 `WorkflowEventController` 中添加触发接口
3. 更新事件文档

这个工作流模块提供了强大而灵活的自动化能力，可以满足各种复杂的业务流程需求。 