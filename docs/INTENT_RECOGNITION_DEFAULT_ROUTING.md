# 意图识别节点默认路由机制

## 概述

意图识别节点现在支持智能默认路由功能，能够根据识别的意图自动路由到相应的目标节点，无需手动配置复杂的条件分支。

## 路由优先级

意图识别节点按以下优先级进行路由决策：

### 1. 直接意图路由 (最高优先级)
当意图识别成功且不需要澄清时，系统会自动路由到意图类别中配置的 `targetNodeId`：

```typescript
{
  id: 'weather_query',
  name: '天气查询',
  description: '查询天气信息',
  targetNodeType: 'tool',
  targetNodeId: 'weather_tool',  // 直接路由到此节点
  // ... 其他配置
}
```

### 2. 条件边路由 (第二优先级)
如果没有直接路由目标，系统会查找匹配的条件边：

```typescript
{
  id: 'intent_edge',
  source: 'intent_recognition',
  target: 'weather_tool',
  condition: '{{intent_recognition.primaryIntent.intentId}} === "weather_query"'
}
```

### 3. 澄清/回退路由 (第三优先级)
当需要澄清意图时，系统会查找澄清或回退边：

```typescript
{
  id: 'clarification_edge',
  source: 'intent_recognition',
  target: 'clarification_llm',
  condition: 'clarification'  // 或 label 包含 'clarification'
}
```

### 4. 默认路由 (最低优先级)
如果以上都不匹配，使用第一个可用的边（向后兼容）。

## 虚拟边创建

当意图类别配置了 `targetNodeId` 但没有对应的边时，系统会自动创建虚拟边：

```typescript
// 自动创建的虚拟边
{
  id: `virtual-intent-${currentNode.id}-${targetNodeId}`,
  source: currentNode.id,
  target: targetNodeId,
  label: `Intent: ${primaryIntent.intentName}`
}
```

## 配置示例

### 1. 基本意图路由配置

```typescript
const intentCategories: IntentCategory[] = [
  {
    id: 'weather_query',
    name: '天气查询',
    description: '查询天气信息',
    keywords: ['天气', '气温', '下雨'],
    examples: ['今天天气怎么样', '明天会下雨吗'],
    targetNodeType: 'tool',
    targetNodeId: 'weather_tool',  // 自动路由目标
    requiredParameters: [
      {
        name: 'location',
        type: 'string',
        description: '查询地点',
        required: true
      }
    ],
    priority: 1,
    enabled: true
  },
  {
    id: 'image_generation',
    name: '图像生成',
    description: '生成AI图像',
    keywords: ['画', '图像', '生成'],
    examples: ['画一幅风景画', '生成一个logo'],
    targetNodeType: 'agent',
    targetNodeId: 'image_agent',  // 自动路由目标
    requiredParameters: [
      {
        name: 'description',
        type: 'string',
        description: '图像描述',
        required: true
      }
    ],
    priority: 2,
    enabled: true
  }
];
```

### 2. 意图识别节点配置

```typescript
{
  id: 'intent_recognition',
  type: 'intent_recognition',
  label: '智能意图识别',
  data: {
    intentModelName: 'gpt-4',
    intentCategories,
    intentConfidenceThreshold: 0.7,
    intentFallbackAction: 'ask_clarification',
    intentParameterExtraction: true,
    // 启用自动路由
    enableAutoRouting: true,
    // 默认澄清节点
    defaultClarificationNodeId: 'clarification_llm'
  }
}
```

### 3. 工作流边配置

```typescript
const edges: WorkflowEdge[] = [
  // 主流程边
  {
    id: 'start-intent',
    source: 'start',
    target: 'intent_recognition'
  },
  
  // 澄清边（可选，如果没有会自动查找）
  {
    id: 'intent-clarification',
    source: 'intent_recognition',
    target: 'clarification_llm',
    condition: 'clarification'
  },
  
  // 回退边（可选）
  {
    id: 'intent-fallback',
    source: 'intent_recognition',
    target: 'fallback_handler',
    condition: 'fallback'
  }
  
  // 注意：不需要为每个意图创建边，系统会自动路由
];
```

## 回退机制

### 1. 意图级回退
当意图识别失败时，使用 `intentFallbackAction` 配置：

```typescript
{
  intentFallbackAction: 'ask_clarification',  // 请求澄清
  // 或
  intentFallbackAction: 'default_intent',     // 使用默认意图
  // 或
  intentFallbackAction: 'human_handoff'       // 转人工处理
}
```

### 2. 路由级回退
当找不到合适的路由时，系统会：

1. 查找标签包含 'clarification'、'fallback' 或 'help' 的 LLM 节点
2. 自动路由到该节点进行处理
3. 如果仍然找不到，抛出路由错误

### 3. 自动回退节点查找

```typescript
// 系统会自动查找这些类型的节点作为回退
const fallbackNode = workflow.nodes.find(node => 
  node.type === 'llm' && 
  (node.label?.toLowerCase().includes('clarification') || 
   node.label?.toLowerCase().includes('fallback') ||
   node.label?.toLowerCase().includes('help'))
);
```

## 调试和监控

### 1. 启用调试模式

```typescript
{
  id: 'intent_recognition',
  type: 'intent_recognition',
  data: {
    // ... 其他配置
    debugMode: true,  // 启用详细日志
    logRouting: true  // 记录路由决策过程
  }
}
```

### 2. 路由日志示例

```
[WorkflowEngineService] Intent recognition: Direct routing to weather_tool for intent weather_query
[WorkflowEngineService] Using fallback node clarification_llm for intent recognition node intent_recognition
[WorkflowEngineService] Created virtual edge: virtual-intent-intent_recognition-weather_tool
```

## 最佳实践

### 1. 意图类别设计
- 为每个意图类别配置明确的 `targetNodeId`
- 使用描述性的节点标签便于自动回退查找
- 设置合理的优先级避免意图冲突

### 2. 工作流设计
- 创建专门的澄清处理节点（标签包含 'clarification'）
- 设计通用的回退处理节点（标签包含 'fallback' 或 'help'）
- 保持简洁的边配置，让系统自动处理路由

### 3. 错误处理
- 配置适当的 `intentFallbackAction`
- 设置合理的置信度阈值
- 提供友好的澄清提示

## 完整示例

```typescript
export const smartIntentWorkflow: Partial<Workflow> = {
  name: '智能意图路由工作流',
  description: '展示意图识别节点的自动路由功能',
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: '开始',
      data: {}
    },
    {
      id: 'intent_recognition',
      type: 'intent_recognition',
      label: '智能意图识别',
      data: {
        intentModelName: 'gpt-4',
        intentCategories: [
          {
            id: 'weather_query',
            name: '天气查询',
            targetNodeId: 'weather_tool',  // 自动路由
            // ... 其他配置
          },
          {
            id: 'help_request',
            name: '帮助请求',
            targetNodeId: 'help_llm',      // 自动路由
            // ... 其他配置
          }
        ],
        intentConfidenceThreshold: 0.7,
        intentFallbackAction: 'ask_clarification',
        enableAutoRouting: true
      }
    },
    {
      id: 'weather_tool',
      type: 'tool',
      label: '天气工具',
      data: {
        toolId: 'weather_api'
      }
    },
    {
      id: 'help_llm',
      type: 'llm',
      label: '帮助助手',
      data: {
        modelName: 'gpt-3.5-turbo',
        prompt: '为用户提供帮助...'
      }
    },
    {
      id: 'clarification_llm',
      type: 'llm',
      label: '澄清助手',  // 关键：标签包含 'clarification'
      data: {
        modelName: 'gpt-3.5-turbo',
        prompt: '请澄清您的意图...'
      }
    },
    {
      id: 'end',
      type: 'end',
      label: '结束',
      data: {}
    }
  ],
  edges: [
    {
      id: 'start-intent',
      source: 'start',
      target: 'intent_recognition'
    },
    // 其他边会自动创建或通过回退机制处理
    {
      id: 'weather-end',
      source: 'weather_tool',
      target: 'end'
    },
    {
      id: 'help-end',
      source: 'help_llm',
      target: 'end'
    },
    {
      id: 'clarification-end',
      source: 'clarification_llm',
      target: 'end'
    }
  ]
};
```

## 总结

意图识别节点现在具备了完善的默认路由机制：

✅ **自动路由**: 根据意图类别的 `targetNodeId` 自动路由  
✅ **虚拟边**: 自动创建缺失的路由边  
✅ **智能回退**: 多层回退机制确保路由成功  
✅ **向后兼容**: 保持与现有条件边配置的兼容性  
✅ **调试支持**: 详细的路由日志和调试信息  

这使得意图识别工作流的配置更加简洁，同时提供了强大的自动路由能力。 