# MCP (Model Context Protocol) 集成指南

## 概述

本系统已集成 Model Context Protocol (MCP) 支持，允许您连接和使用各种 MCP 服务器提供的工具。MCP 是一个开放标准，用于在 AI 应用程序和外部数据源及工具之间建立安全、受控的连接。

## 功能特性

- **多传输协议支持**: STDIO、SSE、WebSocket
- **自动重连机制**: 支持连接失败时的自动重连
- **工具发现**: 自动同步 MCP 服务器提供的工具
- **工作流集成**: 在工作流中无缝使用 MCP 工具
- **并行执行**: 支持并行执行多个 MCP 工具
- **错误处理**: 完善的错误处理和重试机制
- **权限管理**: 基于用户的 MCP 服务器访问控制

## 快速开始

### 1. 创建 MCP 服务器

```bash
# 使用 API 创建 MCP 服务器
curl -X POST http://localhost:1666/api/mcp/servers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "文本分析服务器",
    "description": "提供文本分析功能的 MCP 服务器",
    "transportType": "stdio",
    "config": {
      "command": "python",
      "args": ["-m", "text_analysis_server"],
      "env": {
        "API_KEY": "your-api-key"
      },
      "timeout": 30000,
      "retryAttempts": 3,
      "retryDelay": 1000
    },
    "autoReconnect": true,
    "isPublic": false
  }'
```

### 2. 连接到 MCP 服务器

```bash
# 连接到服务器
curl -X POST http://localhost:1666/api/mcp/servers/{server-id}/connect \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. 查看可用工具

```bash
# 获取所有 MCP 工具
curl -X GET http://localhost:1666/api/mcp/tools \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. 执行 MCP 工具

```bash
# 执行工具
curl -X POST http://localhost:1666/api/mcp/servers/{server-id}/execute \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "analyze_text",
    "arguments": {
      "text": "这是需要分析的文本",
      "language": "zh-CN"
    }
  }'
```

## 配置说明

### 传输类型

#### STDIO 传输
适用于本地命令行程序：

```json
{
  "transportType": "stdio",
  "config": {
    "command": "python",
    "args": ["-m", "my_mcp_server"],
    "env": {
      "API_KEY": "your-api-key"
    }
  }
}
```

#### SSE 传输
适用于 HTTP 服务器端事件：

```json
{
  "transportType": "sse",
  "config": {
    "url": "https://api.example.com/mcp",
    "headers": {
      "Authorization": "Bearer your-token"
    }
  }
}
```

#### WebSocket 传输
适用于 WebSocket 连接：

```json
{
  "transportType": "websocket",
  "config": {
    "wsUrl": "wss://api.example.com/mcp"
  }
}
```

## 工作流中使用 MCP 工具

### 基础用法

在工作流节点中使用 MCP 工具：

```json
{
  "id": "mcp_analysis",
  "type": "mcp_tool",
  "label": "MCP 文本分析",
  "data": {
    "mcpServerName": "text-analysis-server",
    "mcpToolName": "analyze_text",
    "mcpArguments": {
      "text": "{{inputText}}",
      "language": "{{language}}"
    },
    "mcpTimeout": 30000,
    "mcpRetryAttempts": 3,
    "mcpRetryDelay": 1000
  }
}
```

### 并行执行

在并行分支中使用 MCP 工具：

```json
{
  "id": "parallel_mcp_branch",
  "type": "parallel_branch",
  "data": {
    "parallelId": "data_processing",
    "branchName": "textAnalysis"
  }
},
{
  "id": "mcp_text_analysis",
  "type": "mcp_tool",
  "data": {
    "mcpServerName": "text-server",
    "mcpToolName": "analyze",
    "mcpArguments": {
      "text": "{{content}}"
    }
  }
}
```

### 条件执行

根据条件选择不同的 MCP 工具：

```json
{
  "id": "condition_check",
  "type": "condition",
  "data": {
    "condition": "context.dataType === 'text'"
  }
},
{
  "id": "text_processor",
  "type": "mcp_tool",
  "data": {
    "mcpServerName": "text-processor",
    "mcpToolName": "process_text"
  }
}
```

## API 参考

### MCP 服务器管理

#### 创建服务器
- **POST** `/api/mcp/servers`
- **Body**: `CreateMcpServerDto`

#### 获取服务器列表
- **GET** `/api/mcp/servers`

#### 获取服务器详情
- **GET** `/api/mcp/servers/{id}`

#### 更新服务器
- **PATCH** `/api/mcp/servers/{id}`
- **Body**: `UpdateMcpServerDto`

#### 删除服务器
- **DELETE** `/api/mcp/servers/{id}`

### 连接管理

#### 连接服务器
- **POST** `/api/mcp/servers/{id}/connect`

#### 断开连接
- **POST** `/api/mcp/servers/{id}/disconnect`

#### 重新连接
- **POST** `/api/mcp/servers/{id}/reconnect`

#### 获取服务器状态
- **GET** `/api/mcp/servers/{id}/status`

#### 同步工具
- **POST** `/api/mcp/servers/{id}/sync-tools`

### 工具管理

#### 获取工具列表
- **GET** `/api/mcp/tools`
- **Query**: `serverId`, `category`, `tags`, `availableOnly`

#### 获取工具详情
- **GET** `/api/mcp/tools/{id}`

#### 根据名称获取工具
- **GET** `/api/mcp/servers/{serverName}/tools/{toolName}`

### 工具执行

#### 执行工具
- **POST** `/api/mcp/servers/{id}/execute`
- **Body**: `ExecuteMcpToolDto`

#### 根据名称执行工具
- **POST** `/api/mcp/servers/{serverName}/tools/{toolName}/execute`
- **Body**: `{ arguments?: Record<string, any> }`

#### 获取工作流工具列表
- **GET** `/api/mcp/tools-for-workflow`

## 错误处理

### 常见错误

1. **连接失败**
   - 检查服务器配置
   - 验证网络连接
   - 确认认证信息

2. **工具执行超时**
   - 增加 `mcpTimeout` 值
   - 检查服务器响应时间
   - 优化工具参数

3. **权限错误**
   - 验证用户权限
   - 检查服务器访问设置
   - 确认 API 密钥

### 重试机制

系统提供自动重试机制：

```json
{
  "mcpRetryAttempts": 3,
  "mcpRetryDelay": 1000
}
```

### 健康检查

系统每 5 分钟自动检查服务器连接状态，并尝试重连失效的服务器。

## 最佳实践

### 1. 服务器配置

- 使用描述性的服务器名称
- 设置合适的超时时间
- 启用自动重连功能
- 配置适当的重试参数

### 2. 工具使用

- 验证工具参数格式
- 处理工具执行结果
- 实现错误处理逻辑
- 监控工具执行性能

### 3. 安全考虑

- 不要在公共服务器中存储敏感信息
- 使用环境变量管理 API 密钥
- 定期更新认证凭据
- 限制服务器访问权限

### 4. 性能优化

- 合理设置超时时间
- 使用并行执行提高效率
- 缓存常用工具结果
- 监控服务器响应时间

## 示例工作流

系统提供了三个示例工作流模板：

1. **基础使用示例** (`mcpBasicWorkflowTemplate`)
   - 演示基本的 MCP 工具调用
   - 包含结果处理逻辑

2. **并行执行示例** (`mcpParallelWorkflowTemplate`)
   - 演示并行执行多个 MCP 工具
   - 包含结果聚合逻辑

3. **条件执行示例** (`mcpConditionalWorkflowTemplate`)
   - 演示根据条件选择不同工具
   - 包含多种数据类型处理

## 故障排除

### 连接问题

1. 检查服务器配置
2. 验证网络连接
3. 查看服务器日志
4. 测试手动连接

### 工具执行问题

1. 验证工具参数
2. 检查工具可用性
3. 查看执行日志
4. 测试简单参数

### 性能问题

1. 监控执行时间
2. 优化工具参数
3. 调整超时设置
4. 使用并行执行

## 更多资源

- [MCP 官方文档](https://modelcontextprotocol.io/)
- [MCP SDK 文档](https://github.com/modelcontextprotocol/typescript-sdk)
- [示例 MCP 服务器](https://github.com/modelcontextprotocol/servers) 