# 工作流数据传递指南

## 概述

本文档详细介绍了工作流引擎中增强的数据传递机制，支持节点间的复杂数据引用、表达式计算和输入映射功能。

## 数据存储结构

### 节点输出存储

每个节点的输出都会存储在执行上下文的 `nodeOutputs` 对象中：

```javascript
execution.context = {
  // 全局上下文（向后兼容）
  field1: "value1",
  field2: "value2",
  
  // 节点输出存储（新增）
  nodeOutputs: {
    "node1": {
      // 节点的实际输出
      toolResult: { userId: "123", name: "张三" },
      // 元数据
      nodeId: "node1",
      nodeType: "tool",
      nodeLabel: "获取用户数据",
      timestamp: "2024-01-01T10:00:00Z"
    },
    "node2": {
      agentResponse: "分析报告内容...",
      nodeId: "node2",
      nodeType: "agent",
      nodeLabel: "生成报告",
      timestamp: "2024-01-01T10:01:00Z"
    }
  }
}
```

## 数据引用语法

### 1. 节点字段引用

**语法**: `{{nodeId.fieldPath}}`

**示例**:
```javascript
// 引用 fetch-user-data 节点的 toolResult.name 字段
"{{fetch-user-data.toolResult.name}}"

// 引用 calculate-stats 节点的 userStats.totalAmount 字段
"{{calculate-stats.userStats.totalAmount}}"

// 支持数组访问
"{{fetch-orders.toolResult.orders[0].amount}}"

// 支持嵌套对象访问
"{{user-profile.toolResult.address.city}}"
```

### 2. 替代语法

**语法**: `{{nodes.nodeId.fieldPath}}`

```javascript
// 与上面等价的替代语法
"{{nodes.fetch-user-data.toolResult.name}}"
"{{nodes.calculate-stats.userStats.totalAmount}}"
```

### 3. 完整节点输出引用

**语法**: `{{$nodeId}}`

```javascript
// 获取整个节点的输出（JSON字符串）
"{{$fetch-user-data}}"
```

### 4. 全局上下文引用（向后兼容）

**语法**: `{{fieldName}}`

```javascript
// 引用全局上下文中的字段
"{{userId}}"
"{{workflowName}}"
```

### 5. 表达式计算

**语法**: `{{expr:JavaScript表达式}}`

```javascript
// 简单计算
"{{expr:node('calculate-stats').userStats.totalAmount * 0.1}}"

// 条件表达式
"{{expr:node('user-data').toolResult.age >= 18 ? 'adult' : 'minor'}}"

// 数组操作
"{{expr:node('fetch-orders').toolResult.orders.map(o => o.amount).reduce((a,b) => a+b, 0)}}"

// 字符串拼接
"{{expr:'Hello ' + node('user-data').toolResult.name + '!'}}"

// 日期操作
"{{expr:new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()}}"

// 使用内置函数
"{{expr:sum(node('sales-data').toolResult.amounts)}}"
"{{expr:avg(node('scores').toolResult.values)}}"
```

## 输入映射功能

### 基本用法

使用 `_inputMapping` 特殊字段来重新组织数据结构：

```javascript
{
  type: 'script',
  data: {
    _inputMapping: {
      // 输出字段名: 数据源表达式
      'userName': '{{fetch-user-data.toolResult.name}}',
      'userEmail': '{{fetch-user-data.toolResult.email}}',
      'orderCount': '{{calculate-stats.userStats.totalOrders}}',
      'totalSpent': '{{calculate-stats.userStats.totalAmount}}',
      
      // 使用表达式进行计算
      'isVip': '{{expr:node("calculate-stats").userStats.totalAmount > 1000}}',
      'discountRate': '{{expr:Math.min(node("calculate-stats").userStats.totalAmount * 0.001, 0.2)}}',
      
      // 嵌套对象
      'profile': {
        'name': '{{fetch-user-data.toolResult.name}}',
        'level': '{{expr:node("calculate-stats").userStats.totalAmount > 1000 ? "Premium" : "Standard"}}'
      },
      
      // 数组处理
      'recentOrders': '{{fetch-order-data.toolResult.orders}}',
      'orderIds': '{{expr:node("fetch-order-data").toolResult.orders.map(o => o.id)}}'
    },
    
    script: `
      // 映射后的数据作为第一个参数传入
      const input = arguments[0];
      
      return {
        processedData: {
          ...input,
          // 进一步处理
          summary: \`用户 \${input.userName} 共有 \${input.orderCount} 个订单\`
        }
      };
    `
  }
}
```

## 表达式内置函数

### 数学函数
- `sum(array)`: 数组求和
- `avg(array)`: 数组平均值
- `max(...values)`: 最大值
- `min(...values)`: 最小值

### 工具函数
- `len(obj)`: 获取长度（数组长度或对象键数量）
- `keys(obj)`: 获取对象的键数组
- `values(obj)`: 获取对象的值数组

### 节点访问函数
- `node(nodeId)`: 获取指定节点的输出
- `nodes`: 所有节点输出的对象

### 标准JavaScript对象
- `Math`: 数学对象
- `Date`: 日期对象
- `JSON`: JSON操作
- `String`, `Number`, `Boolean`, `Array`, `Object`: 基本类型

## 实际应用示例

### 示例1：用户数据分析工作流

```javascript
// 节点1：获取用户数据
{
  id: 'fetch-user',
  type: 'tool',
  data: {
    toolId: 'user-api',
    userId: '{{userId}}'
  }
}

// 节点2：获取订单数据（使用节点1的输出）
{
  id: 'fetch-orders',
  type: 'tool',
  data: {
    toolId: 'order-api',
    userId: '{{fetch-user.toolResult.userId}}',
    limit: 100
  }
}

// 节点3：计算统计（使用前面节点的数据）
{
  id: 'calculate-stats',
  type: 'script',
  data: {
    script: `
      const user = context.nodeOutputs['fetch-user']?.toolResult || {};
      const orders = context.nodeOutputs['fetch-orders']?.toolResult?.orders || [];
      
      return {
        userStats: {
          totalOrders: orders.length,
          totalAmount: orders.reduce((sum, order) => sum + order.amount, 0),
          avgOrderAmount: orders.length > 0 ? orders.reduce((sum, order) => sum + order.amount, 0) / orders.length : 0,
          firstOrderDate: orders.length > 0 ? orders[0].date : null,
          lastOrderDate: orders.length > 0 ? orders[orders.length - 1].date : null
        }
      };
    `
  }
}

// 节点4：生成报告（使用多个节点的数据）
{
  id: 'generate-report',
  type: 'agent',
  data: {
    agentId: 'report-agent',
    message: `
      请为用户生成分析报告：
      
      用户信息：
      - 姓名：{{fetch-user.toolResult.name}}
      - 邮箱：{{fetch-user.toolResult.email}}
      - 注册时间：{{fetch-user.toolResult.registeredAt}}
      
      订单统计：
      - 总订单数：{{calculate-stats.userStats.totalOrders}}
      - 总金额：${{calculate-stats.userStats.totalAmount}}
      - 平均订单金额：${{calculate-stats.userStats.avgOrderAmount}}
      - 首次订单：{{calculate-stats.userStats.firstOrderDate}}
      - 最近订单：{{calculate-stats.userStats.lastOrderDate}}
      
      请分析用户的消费行为并提供个性化建议。
    `
  }
}

// 节点5：条件判断（使用表达式）
{
  id: 'check-vip-status',
  type: 'condition',
  data: {
    condition: '{{expr:node("calculate-stats").userStats.totalAmount > 1000 && node("calculate-stats").userStats.totalOrders > 5}}'
  }
}

// 节点6：发送通知（使用输入映射）
{
  id: 'send-notification',
  type: 'tool',
  data: {
    toolId: 'notification-service',
    _inputMapping: {
      'recipient': '{{fetch-user.toolResult.email}}',
      'subject': '{{expr:"感谢您的支持，" + node("fetch-user").toolResult.name + "！"}}',
      'message': '{{generate-report.agentResponse}}',
      'priority': '{{expr:node("calculate-stats").userStats.totalAmount > 1000 ? "high" : "normal"}}',
      'metadata': {
        'userId': '{{fetch-user.toolResult.userId}}',
        'totalSpent': '{{calculate-stats.userStats.totalAmount}}',
        'orderCount': '{{calculate-stats.userStats.totalOrders}}',
        'isVip': '{{expr:node("calculate-stats").userStats.totalAmount > 1000}}'
      }
    }
  }
}
```

### 示例2：数组数据处理

```javascript
// 处理产品列表和库存数据
{
  id: 'merge-product-inventory',
  type: 'script',
  data: {
    _inputMapping: {
      'products': '{{fetch-products.toolResult.products}}',
      'inventory': '{{fetch-inventory.toolResult.inventory}}',
      'priceUpdates': '{{fetch-prices.toolResult.updates}}'
    },
    script: `
      const { products, inventory, priceUpdates } = arguments[0];
      
      // 创建查找映射
      const inventoryMap = inventory.reduce((map, item) => {
        map[item.productId] = item;
        return map;
      }, {});
      
      const priceMap = priceUpdates.reduce((map, item) => {
        map[item.productId] = item.newPrice;
        return map;
      }, {});
      
      // 合并数据
      const enrichedProducts = products.map(product => ({
        ...product,
        currentPrice: priceMap[product.id] || product.price,
        stock: inventoryMap[product.id]?.quantity || 0,
        isInStock: (inventoryMap[product.id]?.quantity || 0) > 0,
        stockValue: (priceMap[product.id] || product.price) * (inventoryMap[product.id]?.quantity || 0)
      }));
      
      return {
        enrichedProducts,
        summary: {
          totalProducts: enrichedProducts.length,
          inStockCount: enrichedProducts.filter(p => p.isInStock).length,
          totalStockValue: enrichedProducts.reduce((sum, p) => sum + p.stockValue, 0)
        }
      };
    `
  }
}
```

## 最佳实践

### 1. 命名规范
- 使用有意义的节点ID，如 `fetch-user-data` 而不是 `node1`
- 保持节点ID的一致性和可读性

### 2. 错误处理
- 使用可选链操作符 `?.` 来安全访问可能不存在的字段
- 在表达式中提供默认值：`{{expr:node("data").result?.value || "default"}}`

### 3. 性能考虑
- 避免在表达式中进行复杂的计算，考虑使用script节点
- 大量数据处理时使用输入映射来预处理数据结构

### 4. 调试技巧
- 使用 `{{$nodeId}}` 来查看完整的节点输出
- 在开发时添加临时的script节点来打印中间数据

### 5. 数据类型处理
- 注意字符串和数字的类型转换
- 使用 `JSON.stringify()` 和 `JSON.parse()` 处理复杂对象

## 向后兼容性

新的数据传递机制完全向后兼容：
- 现有的 `{{fieldName}}` 语法继续工作
- 节点输出仍然会合并到全局上下文中
- 现有工作流无需修改即可正常运行

## 故障排除

### 常见问题

1. **引用不存在的节点**
   - 确保节点ID正确
   - 检查节点是否已经执行

2. **字段路径错误**
   - 使用 `{{$nodeId}}` 查看完整输出结构
   - 检查字段名的大小写

3. **表达式语法错误**
   - 确保JavaScript语法正确
   - 注意字符串需要用引号包围

4. **类型错误**
   - 检查数据类型是否匹配
   - 使用类型转换函数如 `Number()`, `String()`

### 调试方法

1. **添加调试节点**：
```javascript
{
  id: 'debug-context',
  type: 'script',
  data: {
    script: `
      console.log('Current context:', JSON.stringify(context, null, 2));
      console.log('Node outputs:', JSON.stringify(context.nodeOutputs, null, 2));
      return { debug: 'Context logged' };
    `
  }
}
```

2. **使用条件节点检查数据**：
```javascript
{
  id: 'check-data',
  type: 'condition',
  data: {
    condition: '{{expr:!!node("fetch-data").toolResult}}'
  }
}
```

通过这些增强的数据传递功能，您可以构建更加灵活和强大的工作流，实现复杂的数据处理和业务逻辑。 