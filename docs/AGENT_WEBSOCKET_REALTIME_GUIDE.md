# Agent WebSocket 实时功能使用指南

## 概述

Agent WebSocket 实时功能允许客户端通过 WebSocket 连接实时监控 Agent 的执行过程，包括：

- 聊天消息开始/完成
- 意图识别结果
- 工具执行状态
- 工作流执行进度
- 错误信息

## 架构图

```
┌─────────────────┐    WebSocket     ┌─────────────────┐
│   客户端应用     │ ◄──────────────► │ AgentRealtimeGateway │
│                │                  │                 │
│ - 订阅对话      │                  │ - 事件监听       │
│ - 订阅Agent     │                  │ - 消息广播       │
│ - 事件处理      │                  │ - 连接管理       │
└─────────────────┘                  └─────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │   AgentService   │
                                    │                 │
                                    │ - 聊天处理       │
                                    │ - 意图识别       │
                                    │ - 工具执行       │
                                    │ - 事件发射       │
                                    └─────────────────┘
```

## 服务端配置

### 1. 环境变量

```env
# WebSocket 配置
WEBSOCKET_CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

### 2. 模块注册

AgentRealtimeGateway 已经在 AgentModule 中注册，无需额外配置。

## 客户端使用

### 1. 安装依赖

```bash
npm install socket.io-client
```

### 2. 基础连接

```typescript
import { AgentRealtimeClient } from './agent-realtime-client';

// 创建客户端
const client = new AgentRealtimeClient('http://localhost:3000', 'user123');

// 等待连接
await new Promise(resolve => {
  client.on('connected', resolve);
});

// 订阅对话和 Agent
await client.subscribeToConversation('conversation-id-123');
await client.subscribeToAgent('agent-id-456');
```

### 3. 事件监听

```typescript
// 聊天开始
client.on('chat-started', (data) => {
  console.log('聊天开始:', data.content);
});

// 意图识别
client.on('intent-recognized', (data) => {
  console.log('识别意图:', data.data.primaryIntent);
  console.log('建议动作:', data.data.suggestedActions);
});

// 工具执行
client.on('tool-execution', (data) => {
  console.log(`工具执行 ${data.data.status}:`, {
    tool: data.data.toolName,
    type: data.data.toolType,
    duration: data.data.duration
  });
});

// 工作流执行
client.on('workflow-execution', (data) => {
  console.log('工作流执行:', {
    workflow: data.data.workflowName,
    status: data.data.status,
    executionId: data.data.executionId
  });
});

// 聊天完成
client.on('chat-completed', (data) => {
  console.log('聊天完成:', data.content);
});

// 错误处理
client.on('agent-error', (data) => {
  console.error('Agent 错误:', data.content);
});
```

## API 端点

### 1. WebSocket 聊天

```http
POST /agents/:id/conversations/:conversationId/websocket-chat
```

**请求体:**
```json
{
  "message": "用户消息内容"
}
```

**响应:**
```json
{
  "success": true,
  "message": "Chat initiated, check WebSocket for real-time updates",
  "data": {
    "message": "AI回复",
    "conversationId": "conversation-id",
    "agentId": "agent-id",
    "intentRecognition": {...},
    "actionResults": [...]
  },
  "websocketNamespace": "/agent-realtime",
  "events": [
    "chat-started",
    "intent-recognized",
    "tool-execution",
    "workflow-execution", 
    "chat-completed",
    "agent-error"
  ]
}
```

### 2. WebSocket 连接

**命名空间:** `/agent-realtime`

**认证参数:**
```javascript
{
  auth: {
    userId: 'user123'
  }
}
```

## WebSocket 事件

### 1. 连接事件

#### `connected`
```json
{
  "socketId": "socket-id",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "message": "Connected to agent realtime service",
  "capabilities": [
    "chat_streaming",
    "intent_recognition", 
    "tool_execution",
    "workflow_monitoring"
  ]
}
```

### 2. 订阅事件

#### `subscribe-conversation` (发送)
```json
{
  "conversationId": "conversation-id-123"
}
```

#### `subscribe-agent` (发送)
```json
{
  "agentId": "agent-id-456"
}
```

#### `subscription-confirmed` (接收)
```json
{
  "type": "conversation|agent",
  "id": "conversation-id-123",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "message": "Subscribed to conversation conversation-id-123"
}
```

### 3. 聊天事件

#### `chat-started`
```json
{
  "conversationId": "conversation-id",
  "agentId": "agent-id",
  "type": "message_start",
  "content": "用户消息",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "userId": "user123"
}
```

#### `chat-completed`
```json
{
  "conversationId": "conversation-id",
  "agentId": "agent-id",
  "messageId": "message-id",
  "type": "message_complete",
  "content": "AI回复",
  "data": {
    "intentRecognition": {...},
    "actionResults": [...]
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "userId": "user123"
}
```

### 4. 意图识别事件

#### `intent-recognized`
```json
{
  "conversationId": "conversation-id",
  "agentId": "agent-id",
  "type": "intent_recognition",
  "data": {
    "userMessage": "用户消息",
    "recognizedIntents": [
      {
        "intentId": "search_intent",
        "intentName": "搜索意图",
        "confidence": 0.95
      }
    ],
    "primaryIntent": {
      "intentId": "search_intent",
      "intentName": "搜索意图",
      "confidence": 0.95
    },
    "suggestedActions": [
      {
        "actionType": "tool",
        "actionId": "search-tool-id",
        "actionName": "搜索工具",
        "parameters": {...}
      }
    ],
    "confidence": 0.95
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 5. 工具执行事件

#### `tool-execution`
```json
{
  "conversationId": "conversation-id",
  "agentId": "agent-id",
  "type": "tool_execution",
  "data": {
    "toolId": "tool-id",
    "toolName": "搜索工具",
    "toolType": "tool|mcp_tool|workflow",
    "status": "started|completed|failed",
    "input": {...},
    "output": {...},
    "error": "错误信息",
    "duration": 1500
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 6. 工作流执行事件

#### `workflow-execution`
```json
{
  "conversationId": "conversation-id",
  "agentId": "agent-id",
  "type": "workflow_execution",
  "data": {
    "workflowId": "workflow-id",
    "workflowName": "数据处理工作流",
    "executionId": "execution-id",
    "status": "running|completed|failed",
    "input": {...},
    "output": {...}
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "userId": "user123"
}
```

### 7. 错误事件

#### `agent-error`
```json
{
  "conversationId": "conversation-id",
  "agentId": "agent-id",
  "type": "error",
  "content": "错误信息",
  "data": {
    "userMessage": "用户消息",
    "errorType": "ValidationError"
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "userId": "user123"
}
```

## 使用流程

### 1. 完整的聊天流程

```typescript
// 1. 连接 WebSocket
const client = new AgentRealtimeClient('http://localhost:3000', 'user123');

// 2. 等待连接
await new Promise(resolve => client.on('connected', resolve));

// 3. 订阅对话和 Agent
await client.subscribeToConversation('conversation-id');
await client.subscribeToAgent('agent-id');

// 4. 设置事件监听器
client.on('chat-started', (data) => {
  console.log('🚀 聊天开始');
});

client.on('intent-recognized', (data) => {
  console.log('🧠 意图识别:', data.data.primaryIntent?.intentName);
});

client.on('tool-execution', (data) => {
  if (data.data.status === 'started') {
    console.log('🔧 工具执行开始:', data.data.toolName);
  } else if (data.data.status === 'completed') {
    console.log('✅ 工具执行完成:', data.data.toolName, `(${data.data.duration}ms)`);
  } else if (data.data.status === 'failed') {
    console.log('❌ 工具执行失败:', data.data.error);
  }
});

client.on('workflow-execution', (data) => {
  console.log('⚙️ 工作流执行:', data.data.workflowName, data.data.status);
});

client.on('chat-completed', (data) => {
  console.log('✨ 聊天完成:', data.content);
});

// 5. 发送聊天消息（通过 HTTP API）
const response = await fetch('/agents/agent-id/conversations/conversation-id/websocket-chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token'
  },
  body: JSON.stringify({
    message: '帮我搜索一下最新的AI新闻'
  })
});

// 6. WebSocket 会实时推送执行过程中的所有事件
```

### 2. React 集成示例

```typescript
// useAgentRealtime.ts
import { useState, useEffect } from 'react';
import { AgentRealtimeClient } from './agent-realtime-client';

export function useAgentRealtime(serverUrl: string, userId: string) {
  const [client, setClient] = useState<AgentRealtimeClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const agentClient = new AgentRealtimeClient(serverUrl, userId);
    
    agentClient.on('connected', () => setIsConnected(true));
    agentClient.on('disconnect', () => setIsConnected(false));

    // 监听所有事件
    const eventTypes = [
      'chat-started', 'intent-recognized', 'tool-execution',
      'workflow-execution', 'chat-completed', 'agent-error'
    ];

    eventTypes.forEach(eventType => {
      agentClient.on(eventType, (data) => {
        setEvents(prev => [...prev, { 
          type: eventType, 
          data, 
          timestamp: new Date() 
        }]);
      });
    });

    setClient(agentClient);
    return () => agentClient.disconnect();
  }, [serverUrl, userId]);

  return { client, isConnected, events };
}

// 组件中使用
function ChatComponent() {
  const { client, isConnected, events } = useAgentRealtime(
    'http://localhost:3000', 
    'user123'
  );

  useEffect(() => {
    if (client && isConnected) {
      client.subscribeToConversation('conversation-id');
      client.subscribeToAgent('agent-id');
    }
  }, [client, isConnected]);

  return (
    <div>
      <div>连接状态: {isConnected ? '已连接' : '未连接'}</div>
      <div>
        {events.map((event, index) => (
          <div key={index}>
            {event.type}: {JSON.stringify(event.data)}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 最佳实践

### 1. 错误处理

```typescript
client.on('error', (error) => {
  console.error('WebSocket 错误:', error);
  // 实现重连逻辑
});

client.on('disconnect', () => {
  console.log('连接断开，尝试重连...');
  // 自动重连已内置，但可以添加额外逻辑
});
```

### 2. 性能优化

```typescript
// 限制事件历史记录数量
const MAX_EVENTS = 100;
client.on('any-event', (data) => {
  setEvents(prev => {
    const newEvents = [...prev, data];
    return newEvents.slice(-MAX_EVENTS);
  });
});
```

### 3. 内存管理

```typescript
// 组件卸载时清理
useEffect(() => {
  return () => {
    client?.disconnect();
  };
}, [client]);
```

## 故障排除

### 1. 连接问题

- 检查 CORS 配置
- 确认 WebSocket 端口开放
- 验证用户认证信息

### 2. 事件丢失

- 确认正确订阅了对话/Agent
- 检查网络连接稳定性
- 查看服务端日志

### 3. 性能问题

- 限制事件历史记录
- 使用事件过滤
- 实现分页加载

## 总结

Agent WebSocket 实时功能提供了完整的聊天执行过程监控，包括：

1. **实时性**: 所有事件都会立即推送给订阅的客户端
2. **可扩展性**: 支持多客户端同时监控同一对话/Agent
3. **完整性**: 覆盖从聊天开始到完成的整个流程
4. **易用性**: 提供简单的客户端 API 和 React Hook

通过这个功能，您可以构建丰富的实时聊天界面，显示 AI 的思考过程、工具使用情况和工作流执行进度，为用户提供透明和交互式的 AI 体验。 