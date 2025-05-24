# LLM节点使用指南

## 概述

LLM节点是工作流系统中的一个强大组件，允许您在工作流中集成大语言模型（Large Language Model）的能力。通过LLM节点，您可以进行文本分析、内容生成、格式转换、多轮对话等各种AI驱动的任务。

## 核心功能

### 1. 基础文本处理
- 文本分析和理解
- 内容生成和创作
- 语言翻译
- 文本摘要
- 情感分析

### 2. 格式转换
- JSON到Markdown转换
- 结构化数据处理
- 报告生成
- 文档格式化

### 3. 多轮对话
- 上下文保持
- 对话历史管理
- 个性化回应
- 智能问答

### 4. 高级处理
- 并行处理支持
- 错误重试机制
- 输出后处理
- 字段提取

## 配置参数

### 必需参数

| 参数 | 类型 | 描述 |
|------|------|------|
| `modelName` 或 `modelId` | string | 要使用的LLM模型名称或ID |
| `prompt` 或 `messages` | string/array | 提示词或消息数组 |

### 模型配置

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `temperature` | number | 0.7 | 控制输出的随机性 (0-2) |
| `maxTokens` | number | 1000 | 最大输出token数 |
| `topP` | number | 1.0 | 核采样参数 |
| `frequencyPenalty` | number | 0 | 频率惩罚 (-2 到 2) |
| `presencePenalty` | number | 0 | 存在惩罚 (-2 到 2) |
| `stream` | boolean | false | 是否启用流式输出 |

### 对话配置

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `enableConversation` | boolean | false | 是否启用多轮对话 |
| `conversationId` | string | - | 对话ID，用于区分不同对话 |
| `conversationMaxHistory` | number | 10 | 最大对话历史记录数 |
| `systemPrompt` | string | - | 系统提示词 |
| `messages` | array | [] | 预定义消息数组 |

### 输出处理

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `outputFormat` | string | 'text' | 输出格式：'text', 'json', 'markdown' |
| `extractFields` | array | [] | 要从输出中提取的字段名 |
| `transformScript` | string | - | 输出转换脚本 |

### 错误处理

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `timeout` | number | 30000 | 超时时间（毫秒） |
| `retryAttempts` | number | 3 | 重试次数 |
| `retryDelay` | number | 1000 | 重试延迟（毫秒） |

## 使用示例

### 1. 基础文本分析

```json
{
  "id": "text_analysis",
  "type": "llm",
  "label": "文本分析",
  "data": {
    "modelName": "gpt-3.5-turbo",
    "systemPrompt": "你是一个专业的文本分析师。",
    "prompt": "请分析以下文本的情感倾向：{{inputText}}",
    "temperature": 0.3,
    "maxTokens": 500,
    "outputFormat": "json"
  }
}
```

### 2. 多轮对话

```json
{
  "id": "conversation",
  "type": "llm",
  "label": "智能对话",
  "data": {
    "modelName": "gpt-4",
    "systemPrompt": "你是一个友好的AI助手。",
    "enableConversation": true,
    "conversationId": "user_chat",
    "conversationMaxHistory": 5,
    "messages": [
      {
        "role": "user",
        "content": "{{userMessage}}"
      }
    ],
    "temperature": 0.7,
    "maxTokens": 600
  }
}
```

### 3. 格式转换

```json
{
  "id": "format_converter",
  "type": "llm",
  "label": "格式转换",
  "data": {
    "modelName": "gpt-3.5-turbo",
    "systemPrompt": "你是一个格式转换专家。",
    "prompt": "将以下JSON数据转换为Markdown表格：{{jsonData}}",
    "outputFormat": "markdown",
    "transformScript": "return { formattedData: output, timestamp: new Date().toISOString() };"
  }
}
```

### 4. 字段提取

```json
{
  "id": "data_extraction",
  "type": "llm",
  "label": "数据提取",
  "data": {
    "modelName": "gpt-3.5-turbo",
    "prompt": "从以下文本中提取关键信息：{{text}}",
    "outputFormat": "json",
    "extractFields": ["name", "email", "phone", "company"],
    "retryAttempts": 2
  }
}
```

## 变量引用

LLM节点支持所有工作流数据引用模式：

### 1. 节点输出引用
```
{{nodeId.fieldPath}}          # 引用特定节点的字段
{{nodes.nodeId.fieldPath}}    # 替代语法
{{$nodeId}}                   # 引用完整节点输出
```

### 2. 全局变量引用
```
{{variableName}}              # 引用全局变量
```

### 3. 表达式引用
```
{{expr:node('nodeId').field}} # 表达式语法
```

### 4. LLM特定输出字段
```
{{llmNode.llmResponse}}       # LLM处理后的输出
{{llmNode.rawResponse}}       # 原始LLM响应
{{llmNode.extractedFields}}   # 提取的字段
{{llmNode.usage}}             # Token使用情况
```

## 输出结构

LLM节点的输出包含以下字段：

```json
{
  "llmResponse": "处理后的输出内容",
  "rawResponse": "原始LLM响应",
  "modelName": "使用的模型名称",
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 200,
    "total_tokens": 300
  },
  "extractedFields": {
    "field1": "value1",
    "field2": "value2"
  },
  "conversationId": "对话ID（如果启用对话）",
  "executionTime": "2024-01-01T12:00:00.000Z",
  "outputFormat": "text"
}
```

## 最佳实践

### 1. 提示词设计
- 使用清晰、具体的指令
- 提供示例输出格式
- 设置适当的角色和上下文
- 使用结构化的提示词模板

### 2. 参数调优
- **创意任务**：使用较高的temperature (0.7-1.0)
- **分析任务**：使用较低的temperature (0.1-0.3)
- **平衡任务**：使用中等的temperature (0.4-0.6)

### 3. 错误处理
- 设置合理的超时时间
- 配置重试机制
- 使用输出格式验证
- 实现降级策略

### 4. 性能优化
- 合理设置maxTokens
- 使用并行处理提高效率
- 缓存常用结果
- 监控token使用量

### 5. 对话管理
- 使用有意义的conversationId
- 限制对话历史长度
- 定期清理过期对话
- 实现上下文压缩

## 高级用法

### 1. 转换脚本

转换脚本允许您对LLM输出进行后处理：

```javascript
// 示例转换脚本
return {
  processedData: output.toUpperCase(),
  wordCount: output.split(' ').length,
  sentiment: extractedFields.sentiment,
  timestamp: new Date().toISOString(),
  metadata: {
    model: context.modelName,
    temperature: context.temperature
  }
};
```

### 2. 条件处理

结合条件节点实现智能分支：

```json
{
  "id": "sentiment_check",
  "type": "condition",
  "data": {
    "condition": "{{llm_analysis.extractedFields.sentiment}} === 'positive'"
  }
}
```

### 3. 并行处理

使用并行节点同时执行多个LLM任务：

```json
{
  "id": "parallel_analysis",
  "type": "parallel_start",
  "data": {
    "parallelId": "multi_llm",
    "strategy": "wait_all"
  }
}
```

## 故障排除

### 常见问题

1. **模型不存在**
   - 检查modelName或modelId是否正确
   - 确认模型在LLM服务中可用

2. **超时错误**
   - 增加timeout值
   - 减少maxTokens
   - 简化提示词

3. **格式解析错误**
   - 检查outputFormat设置
   - 验证LLM输出格式
   - 使用transformScript进行格式修正

4. **对话历史丢失**
   - 确认conversationId唯一性
   - 检查conversationMaxHistory设置
   - 验证上下文保存机制

### 调试技巧

1. **启用详细日志**
   ```json
   {
     "debugMode": true,
     "logLevel": "debug"
   }
   ```

2. **使用测试提示词**
   ```
   请回复"测试成功"以确认连接正常
   ```

3. **检查输出结构**
   ```json
   {
     "outputFormat": "json",
     "extractFields": ["debug_info"]
   }
   ```

## 安全考虑

1. **输入验证**
   - 过滤敏感信息
   - 限制输入长度
   - 验证输入格式

2. **输出过滤**
   - 检查有害内容
   - 过滤敏感数据
   - 验证输出格式

3. **访问控制**
   - 限制模型访问权限
   - 监控使用量
   - 记录操作日志

## 示例工作流

查看以下示例文件了解完整的LLM节点使用案例：

- `src/workflow/templates/llm-workflow-example.ts` - 基础LLM工作流示例
- `src/workflow/templates/data-flow-example-workflow.ts` - 数据流处理示例

这些示例展示了如何在实际工作流中有效使用LLM节点进行各种文本处理任务。 