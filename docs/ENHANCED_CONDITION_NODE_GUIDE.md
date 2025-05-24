# 增强条件节点使用指南

## 概述

增强条件节点是对传统条件节点的重大升级，提供了智能路由、值匹配和默认节点等高级功能。它解决了你提出的问题：**支持默认节点，当前面节点传过来的值计算后与备选节点匹配时，自动选择对应节点**。

## 主要特性

### ✅ 已实现的功能

1. **默认节点机制** - 当没有匹配的规则时，自动路由到默认节点
2. **智能路由** - 基于多个规则进行匹配，支持优先级和权重
3. **值匹配** - 根据特定字段值匹配到对应节点
4. **多种匹配策略** - 支持精确匹配、包含匹配、正则匹配、范围匹配等
5. **模糊匹配** - 支持字符串相似度匹配
6. **回退机制** - 多层回退保证工作流的健壮性
7. **调试模式** - 详细的路由信息和调试输出

## 条件节点类型

### 1. 简单条件节点 (simple)

传统的条件判断，保持向后兼容。

```typescript
{
  type: 'condition',
  data: {
    conditionType: 'simple',
    condition: '${age} >= 18'
  }
}
```

### 2. 智能路由器 (smart_router)

基于多个规则进行智能路由，支持复杂的匹配逻辑。

```typescript
{
  type: 'condition',
  data: {
    conditionType: 'smart_router',
    routingStrategy: 'weighted_score', // 'first_match' | 'best_match' | 'weighted_score'
    enableFallback: true,
    defaultTargetNodeId: 'default_handler',
    debugMode: true,
    routingRules: [
      {
        id: 'adult_rule',
        name: '成人路由',
        targetNodeId: 'adult_content',
        condition: '${age} >= 18 && ${age} <= 65',
        priority: 8,
        weight: 1.0,
        enabled: true,
        matchType: 'exact'
      }
    ]
  }
}
```

### 3. 值匹配器 (value_matcher)

根据特定字段值匹配到对应节点，支持模糊匹配。

```typescript
{
  type: 'condition',
  data: {
    conditionType: 'value_matcher',
    enableFallback: true,
    defaultTargetNodeId: 'other_hobby',
    debugMode: true,
    valueMatchingConfig: {
      sourceField: 'hobby',
      enableFuzzyMatch: true,
      fuzzyThreshold: 0.7,
      caseSensitive: false,
      matchingRules: [
        {
          id: 'reading_rule',
          name: '阅读爱好',
          targetNodeId: 'reading_content',
          matchValues: ['读书', '阅读', '看书', 'reading'],
          matchType: 'contains',
          priority: 10,
          enabled: true
        }
      ]
    }
  }
}
```

## 路由策略

### 1. 优先匹配 (first_match)
按优先级排序，选择第一个匹配的规则。

### 2. 最佳匹配 (best_match)
选择得分最高的规则。

### 3. 加权评分 (weighted_score)
综合优先级和权重计算最终得分：
```
finalScore = (priority * 0.3 + score * 0.7) * weight
```

## 匹配类型

### 智能路由器匹配类型

- **exact**: 精确条件匹配
- **contains**: 包含匹配
- **regex**: 正则表达式匹配
- **range**: 数值范围匹配
- **custom**: 自定义匹配函数

### 值匹配器匹配类型

- **exact**: 精确匹配
- **contains**: 包含匹配
- **startsWith**: 开头匹配
- **endsWith**: 结尾匹配
- **regex**: 正则表达式匹配
- **range**: 数值范围匹配

## 默认节点和回退机制

### 三层回退保护

1. **规则级回退**: 单个规则匹配失败时的处理
2. **节点级回退**: 所有规则都不匹配时使用默认节点
3. **错误级回退**: 执行出错时的兜底处理

```typescript
{
  enableFallback: true,
  defaultTargetNodeId: 'default_handler',  // 主要默认节点
  fallbackNodeId: 'emergency_handler',     // 备用回退节点
}
```

## 边条件配置

增强条件节点支持特殊的边条件：

```typescript
{
  source: 'smart_router',
  target: 'target_node',
  condition: 'selectedNode'  // 特殊条件，表示使用智能路由结果
}
```

## 调试和监控

### 调试模式输出

启用 `debugMode: true` 后，会输出详细的路由信息：

```json
{
  "conditionResult": true,
  "selectedNodeId": "adult_content",
  "matchedRules": [...],
  "selectedRule": {...},
  "strategy": "weighted_score",
  "debugInfo": {
    "evaluatedRules": [
      {
        "ruleId": "adult_rule",
        "ruleName": "成人路由",
        "result": true,
        "score": 1.0
      }
    ]
  }
}
```

## 使用示例

### 示例1: 年龄分组路由

```typescript
// 用户输入: { age: 25, hobby: "阅读" }
// 智能路由器会：
// 1. 评估所有规则
// 2. 发现 adult_rule 匹配 (25 >= 18 && 25 <= 65)
// 3. 路由到 adult_content 节点
```

### 示例2: 兴趣匹配路由

```typescript
// 用户输入: { hobby: "读书" }
// 值匹配器会：
// 1. 检查 hobby 字段值 "读书"
// 2. 发现匹配 reading_rule 的 "读书" 值
// 3. 路由到 reading_content 节点
```

### 示例3: 模糊匹配

```typescript
// 用户输入: { hobby: "阅读书籍" }
// 值匹配器会：
// 1. 精确匹配失败
// 2. 启用模糊匹配
// 3. 计算与 "阅读" 的相似度 > 0.7
// 4. 路由到 reading_content 节点
```

## 性能优化

### 1. 规则优化
- 将高频匹配的规则设置更高优先级
- 禁用不需要的规则 (`enabled: false`)
- 使用合适的匹配类型

### 2. 表达式优化
- 避免复杂的条件表达式
- 使用简单的字段比较
- 缓存计算结果

### 3. 调试模式
- 生产环境关闭调试模式
- 仅在开发时启用详细日志

## 最佳实践

### 1. 规则设计
```typescript
// ✅ 好的规则设计
{
  id: 'clear_rule_name',
  name: '清晰的规则名称',
  description: '详细的规则描述',
  condition: '${age} >= 18',  // 简单明确的条件
  priority: 10,               // 明确的优先级
  enabled: true
}

// ❌ 避免的设计
{
  id: 'rule1',
  condition: '${age} >= 18 && ${hobby}.includes("sport") && ${location} === "beijing"',
  priority: 0
}
```

### 2. 默认节点配置
```typescript
// ✅ 总是配置默认节点
{
  enableFallback: true,
  defaultTargetNodeId: 'default_handler',
  fallbackNodeId: 'error_handler'
}
```

### 3. 调试配置
```typescript
// ✅ 开发环境
{
  debugMode: true,
  routingStrategy: 'weighted_score'
}

// ✅ 生产环境
{
  debugMode: false,
  routingStrategy: 'first_match'  // 更快的策略
}
```

## 错误处理

### 常见错误和解决方案

1. **No valid edge found**
   - 确保配置了默认节点
   - 检查边条件是否正确
   - 启用回退机制

2. **Expression evaluation failed**
   - 检查变量名是否正确
   - 确保变量在上下文中存在
   - 使用简单的表达式

3. **Rule evaluation error**
   - 检查规则条件语法
   - 确保匹配类型正确
   - 验证期望值格式

## 总结

增强条件节点完全解决了你提出的需求：

✅ **默认节点支持**: 当没有匹配规则时自动使用默认节点
✅ **值匹配路由**: 前面节点传来的值可以与备选节点精确匹配
✅ **智能选择**: 支持多种匹配策略和优先级机制
✅ **健壮性**: 多层回退机制确保工作流不会中断
✅ **可扩展性**: 支持自定义匹配函数和复杂路由逻辑

这个实现提供了比传统条件节点更强大、更灵活的路由能力，同时保持了良好的性能和可维护性。 