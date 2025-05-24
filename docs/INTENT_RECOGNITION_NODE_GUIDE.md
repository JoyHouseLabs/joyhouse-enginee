# 意图识别节点使用指南

## 概述

意图识别节点是工作流系统中的智能路由组件，能够理解用户的自然语言输入，识别用户意图，并自动引导工作流执行相应的操作。通过结合大语言模型的能力，该节点可以实现智能的对话理解、参数提取和动态工作流路由。

## 核心功能

### 1. 智能意图识别
- 基于自然语言理解用户意图
- 支持多种预定义意图类别
- 可配置的置信度阈值
- 智能回退策略

### 2. 参数自动提取
- 从用户输入中提取关键参数
- 支持多种数据类型验证
- 智能参数补全提示
- 参数验证和格式化

### 3. 动态工作流路由
- 根据识别的意图自动路由到相应节点
- 支持条件分支和复杂路由逻辑
- 可视化的意图分支管理
- 灵活的目标节点配置

### 4. 对话上下文管理
- 维护对话历史记录
- 上下文感知的意图识别
- 多轮对话支持
- 智能澄清机制

## 配置参数

### 必需参数

| 参数 | 类型 | 描述 |
|------|------|------|
| `intentCategories` | IntentCategory[] | 意图类别定义数组 |
| `intentModelName` 或 `intentModelId` | string | 用于意图识别的LLM模型 |

### 模型配置

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `intentModelName` | string | 'gpt-3.5-turbo' | LLM模型名称 |
| `intentModelId` | string | - | LLM模型ID（替代modelName） |
| `intentSystemPrompt` | string | 默认提示词 | 系统提示词 |
| `intentCustomPrompt` | string | - | 自定义意图识别提示词 |

### 意图识别配置

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `intentConfidenceThreshold` | number | 0.7 | 意图置信度阈值 (0-1) |
| `intentFallbackAction` | string | 'ask_clarification' | 回退策略 |
| `intentOutputFormat` | string | 'structured' | 输出格式 |
| `intentEnableMultiIntent` | boolean | false | 是否启用多意图识别 |

### 参数提取配置

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `intentParameterExtraction` | boolean | true | 是否启用参数提取 |
| `intentParameterSchema` | object | {} | 参数模式定义 |
| `intentValidationRules` | array | [] | 参数验证规则 |

### 对话管理配置

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `intentEnableHistory` | boolean | true | 是否启用对话历史 |
| `intentHistoryMaxLength` | number | 10 | 最大历史记录数 |
| `intentContextWindow` | number | 5 | 上下文窗口大小 |

### 错误处理配置

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `timeout` | number | 30000 | 超时时间（毫秒） |
| `retryAttempts` | number | 3 | 重试次数 |
| `retryDelay` | number | 1000 | 重试延迟（毫秒） |

## 意图类别定义

### IntentCategory 接口

```typescript
interface IntentCategory {
  id: string;                    // 意图唯一标识
  name: string;                  // 意图名称
  description: string;           // 意图描述
  keywords?: string[];           // 关键词列表
  examples?: string[];           // 示例输入
  targetNodeType?: string;       // 目标节点类型
  targetNodeId?: string;         // 目标节点ID
  requiredParameters?: IntentParameter[]; // 必需参数
  confidence?: number;           // 预期置信度
  priority?: number;             // 优先级
  enabled?: boolean;             // 是否启用
}
```

### IntentParameter 接口

```typescript
interface IntentParameter {
  name: string;                  // 参数名称
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  description: string;           // 参数描述
  required: boolean;             // 是否必需
  defaultValue?: any;            // 默认值
  validation?: {                 // 验证规则
    pattern?: string;            // 正则表达式
    min?: number;                // 最小值
    max?: number;                // 最大值
    options?: any[];             // 可选值列表
  };
  extractionPrompt?: string;     // 提取提示词
}
```

## 使用示例

### 1. 基础意图识别

```json
{
  "id": "basic_intent",
  "type": "intent_recognition",
  "label": "基础意图识别",
  "data": {
    "intentModelName": "gpt-3.5-turbo",
    "intentCategories": [
      {
        "id": "greeting",
        "name": "问候",
        "description": "用户的问候语",
        "keywords": ["你好", "早上好", "晚上好"],
        "examples": ["你好", "早上好", "Hello"],
        "targetNodeType": "llm",
        "targetNodeId": "greeting_response"
      }
    ],
    "intentConfidenceThreshold": 0.6
  }
}
```

### 2. 带参数提取的意图识别

```json
{
  "id": "weather_intent",
  "type": "intent_recognition",
  "label": "天气查询意图",
  "data": {
    "intentModelName": "gpt-4",
    "intentCategories": [
      {
        "id": "weather_query",
        "name": "天气查询",
        "description": "查询天气信息",
        "keywords": ["天气", "气温", "下雨"],
        "examples": ["明天天气怎么样", "北京今天下雨吗"],
        "targetNodeType": "tool",
        "targetNodeId": "weather_tool",
        "requiredParameters": [
          {
            "name": "location",
            "type": "string",
            "description": "查询天气的地点",
            "required": true,
            "extractionPrompt": "从用户输入中提取地点信息"
          },
          {
            "name": "date",
            "type": "string",
            "description": "查询的日期",
            "required": false,
            "defaultValue": "今天"
          }
        ]
      }
    ],
    "intentParameterExtraction": true,
    "intentConfidenceThreshold": 0.7
  }
}
```

### 3. 多意图识别

```json
{
  "id": "multi_intent",
  "type": "intent_recognition",
  "label": "多意图识别",
  "data": {
    "intentModelName": "gpt-4",
    "intentEnableMultiIntent": true,
    "intentCategories": [
      {
        "id": "weather_and_reminder",
        "name": "天气和提醒",
        "description": "同时查询天气和设置提醒",
        "examples": ["查询明天天气并提醒我带伞"]
      }
    ]
  }
}
```

## 输出结构

意图识别节点的输出包含以下字段：

```json
{
  "recognizedIntents": [
    {
      "intentId": "weather_query",
      "intentName": "天气查询",
      "confidence": 0.95,
      "reasoning": "用户询问天气信息",
      "extractedEntities": {
        "location": "北京",
        "date": "明天"
      }
    }
  ],
  "primaryIntent": {
    "intentId": "weather_query",
    "intentName": "天气查询",
    "confidence": 0.95
  },
  "allIntents": [...],
  "confidence": 0.95,
  "userInput": "明天北京的天气怎么样？",
  "extractedParameters": {
    "location": "北京",
    "date": "明天"
  },
  "parameterExtractionNeeded": false,
  "fallbackAction": null,
  "needsClarification": false,
  "suggestedActions": [
    {
      "intentId": "weather_query",
      "intentName": "天气查询",
      "description": "查询天气信息",
      "targetNodeType": "tool",
      "targetNodeId": "weather_tool",
      "confidence": 0.95,
      "requiredParameters": [...]
    }
  ],
  "executionTime": "2024-01-01T12:00:00.000Z",
  "modelUsed": "gpt-4",
  "rawLlmResponse": "..."
}
```

## 可视化界面设计

### 1. 意图分支可视化

意图识别节点在可视化界面中的呈现方式：

```
┌─────────────────┐
│   意图识别节点    │
│                │
│ 🧠 智能识别     │
│ 📊 置信度: 0.7  │
│ 🎯 5个意图类别  │
└─────────────────┘
        │
        ▼
┌─────────────────┐
│   意图路由器     │
│                │
│ ├─ 天气查询     │──→ [天气工具]
│ ├─ 图像生成     │──→ [图像代理]
│ ├─ 数据收集     │──→ [循环节点]
│ ├─ 邮件发送     │──→ [邮件工具]
│ └─ 帮助请求     │──→ [帮助LLM]
└─────────────────┘
```

### 2. 参数提取界面

当需要参数提取时的界面流程：

```
用户输入: "明天天气怎么样？"
    ↓
┌─────────────────┐
│   意图识别       │
│ ✅ 天气查询      │
│ 📍 地点: 未指定  │
│ 📅 日期: 明天    │
└─────────────────┘
    ↓
┌─────────────────┐
│   参数补全       │
│ ❓ 请提供地点    │
│ 💬 "请问您要查询 │
│    哪个城市的天气？"│
└─────────────────┘
```

### 3. 配置界面设计

意图类别配置界面：

```
┌─ 意图类别配置 ─────────────────────────┐
│                                      │
│ 意图ID: [weather_query            ]  │
│ 意图名称: [天气查询                ]  │
│ 描述: [查询天气信息                ]  │
│                                      │
│ 关键词: [天气] [气温] [下雨] [+添加]   │
│                                      │
│ 示例输入:                             │
│ • 明天天气怎么样                      │
│ • 北京今天下雨吗                      │
│ [+添加示例]                          │
│                                      │
│ 目标节点:                             │
│ 类型: [tool ▼]  ID: [weather_tool]   │
│                                      │
│ 必需参数:                             │
│ ┌─ location (string) ─ 必需 ─────┐   │
│ │ 描述: 查询天气的地点            │   │
│ │ 提取提示: 从用户输入中提取地点   │   │
│ └─────────────────────────────────┘   │
│ [+添加参数]                          │
│                                      │
│ 优先级: [1] 置信度阈值: [0.7]         │
│ □ 启用此意图类别                      │
└──────────────────────────────────────┘
```

## 工作流路由策略

### 1. 条件路由

基于意图识别结果的条件路由：

```json
{
  "id": "intent_router",
  "type": "condition",
  "data": {
    "condition": "{{intent_recognition.primaryIntent.intentId}} === 'weather_query'"
  }
}
```

### 2. 参数验证路由

基于参数提取结果的路由：

```json
{
  "id": "param_check",
  "type": "condition", 
  "data": {
    "condition": "{{intent_recognition.parameterExtractionNeeded}} === false"
  }
}
```

### 3. 置信度路由

基于置信度的路由决策：

```json
{
  "id": "confidence_check",
  "type": "condition",
  "data": {
    "condition": "{{intent_recognition.confidence}} >= 0.8"
  }
}
```

## 最佳实践

### 1. 意图类别设计

- **明确性**: 每个意图类别应该有清晰、不重叠的定义
- **完整性**: 提供足够的关键词和示例
- **层次性**: 使用优先级管理意图冲突
- **可扩展性**: 设计时考虑未来的意图扩展

### 2. 参数提取优化

- **渐进式提取**: 优先提取最重要的参数
- **智能默认值**: 为可选参数设置合理默认值
- **验证规则**: 使用验证规则确保参数质量
- **用户友好**: 提供清晰的参数补全提示

### 3. 置信度调优

- **阈值设置**: 根据应用场景调整置信度阈值
- **A/B测试**: 通过测试优化阈值设置
- **回退策略**: 设计合理的低置信度处理方案
- **持续优化**: 基于用户反馈调整模型参数

### 4. 对话管理

- **上下文保持**: 维护适当长度的对话历史
- **澄清机制**: 设计友好的澄清对话流程
- **错误恢复**: 提供从错误识别中恢复的机制
- **用户引导**: 主动引导用户提供必要信息

## 高级功能

### 1. 动态意图学习

```json
{
  "intentAdaptiveLearning": true,
  "intentFeedbackCollection": true,
  "intentModelRetraining": {
    "enabled": true,
    "schedule": "weekly",
    "minSamples": 100
  }
}
```

### 2. 多模态意图识别

```json
{
  "intentMultiModal": {
    "text": true,
    "voice": true,
    "image": false
  },
  "intentVoiceProcessing": {
    "speechToText": "whisper-1",
    "languageDetection": true
  }
}
```

### 3. 意图组合和嵌套

```json
{
  "intentComposition": {
    "enableNesting": true,
    "maxNestingLevel": 3,
    "compositionRules": [
      {
        "primary": "weather_query",
        "secondary": "reminder_set",
        "combination": "sequential"
      }
    ]
  }
}
```

## 故障排除

### 常见问题

1. **意图识别准确率低**
   - 检查意图类别定义是否清晰
   - 增加关键词和示例
   - 调整置信度阈值
   - 优化系统提示词

2. **参数提取失败**
   - 检查参数定义是否准确
   - 优化参数提取提示词
   - 验证输入格式
   - 增加参数验证规则

3. **路由错误**
   - 检查条件表达式语法
   - 验证节点ID引用
   - 确认意图类别配置
   - 测试边界条件

4. **性能问题**
   - 优化模型选择
   - 减少不必要的参数提取
   - 调整重试策略
   - 使用缓存机制

### 调试技巧

1. **启用详细日志**
   ```json
   {
     "debugMode": true,
     "logLevel": "debug",
     "intentDebugOutput": true
   }
   ```

2. **测试意图识别**
   ```json
   {
     "intentTestMode": true,
     "intentTestInputs": [
       "明天天气怎么样？",
       "给我画一幅画",
       "发送邮件给张三"
     ]
   }
   ```

3. **参数提取验证**
   ```json
   {
     "parameterValidationMode": "strict",
     "parameterDebugOutput": true
   }
   ```

## 安全考虑

1. **输入验证**
   - 过滤恶意输入
   - 限制输入长度
   - 验证参数格式

2. **权限控制**
   - 限制敏感操作的意图
   - 实施用户权限检查
   - 记录操作日志

3. **数据保护**
   - 加密敏感参数
   - 限制数据访问范围
   - 实施数据脱敏

## 示例工作流

查看以下示例文件了解完整的意图识别节点使用案例：

- `src/workflow/templates/intent-recognition-workflow-example.ts` - 完整意图识别工作流
- `src/workflow/templates/simple-intent-workflow-example.ts` - 简单意图识别示例

这些示例展示了如何在实际工作流中有效使用意图识别节点进行智能路由和参数提取。 