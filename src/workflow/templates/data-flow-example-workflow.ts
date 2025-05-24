import { WorkflowNode, WorkflowEdge } from '../entities/workflow.entity';

export const dataFlowExampleWorkflowTemplate = {
  name: '数据流传递示例工作流',
  description:
    '展示节点间数据传递的各种方式，包括字段引用、表达式计算和输入映射',
  isTemplate: true,
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: '开始',
      position: { x: 100, y: 200 },
      data: {},
    },
    {
      id: 'fetch-user-data',
      type: 'tool',
      label: '获取用户数据',
      position: { x: 300, y: 200 },
      data: {
        toolId: '{{USER_DATA_TOOL_ID}}',
        userId: '{{userId}}',
        description: '获取用户基本信息',
      },
    },
    {
      id: 'fetch-order-data',
      type: 'tool',
      label: '获取订单数据',
      position: { x: 300, y: 300 },
      data: {
        toolId: '{{ORDER_DATA_TOOL_ID}}',
        // 使用节点输出引用：引用fetch-user-data节点的toolResult.userId字段
        userId: '{{fetch-user-data.toolResult.userId}}',
        // 或者使用表达式：
        // userId: '{{expr:node("fetch-user-data").toolResult.userId}}',
        description: '根据用户ID获取订单信息',
      },
    },
    {
      id: 'calculate-stats',
      type: 'script',
      label: '计算统计数据',
      position: { x: 500, y: 250 },
      data: {
        script:
          'const userData = context.nodeOutputs["fetch-user-data"]?.toolResult || {}; const orderData = context.nodeOutputs["fetch-order-data"]?.toolResult || {}; const orders = orderData.orders || []; const totalAmount = orders.reduce((sum, order) => sum + (order.amount || 0), 0); const avgOrderAmount = orders.length > 0 ? totalAmount / orders.length : 0; return { userStats: { userId: userData.userId, userName: userData.name, totalOrders: orders.length, totalAmount: totalAmount, avgOrderAmount: avgOrderAmount, lastOrderDate: orders.length > 0 ? orders[orders.length - 1].date : null } };',
      },
    },
    {
      id: 'generate-report',
      type: 'agent',
      label: '生成分析报告',
      position: { x: 700, y: 250 },
      data: {
        agentId: '{{REPORT_AGENT_ID}}',
        message:
          '请为用户生成分析报告：用户信息 - 姓名：{{fetch-user-data.toolResult.name}}，邮箱：{{fetch-user-data.toolResult.email}}，注册时间：{{fetch-user-data.toolResult.registeredAt}}。订单统计 - 总订单数：{{calculate-stats.userStats.totalOrders}}，总金额：${{calculate-stats.userStats.totalAmount}}，平均订单金额：${{calculate-stats.userStats.avgOrderAmount}}，最后订单时间：{{calculate-stats.userStats.lastOrderDate}}。请分析用户的消费行为并提供个性化建议。',
        description: '基于用户数据生成个性化分析报告',
      },
    },
    {
      id: 'format-output',
      type: 'script',
      label: '格式化最终输出',
      position: { x: 900, y: 250 },
      data: {
        // 使用输入映射功能
        _inputMapping: {
          user: '{{$fetch-user-data}}',
          orders: '{{fetch-order-data.toolResult.orders}}',
          statistics: '{{calculate-stats.userStats}}',
          report: '{{generate-report.agentResponse}}',
          summary:
            '{{expr:{ totalValue: node("calculate-stats").userStats.totalAmount, orderCount: node("fetch-order-data").toolResult.orders.length, userName: node("fetch-user-data").toolResult.name }}}',
          metadata: {
            generatedAt: '{{expr:new Date().toISOString()}}',
            workflowVersion: '1.0',
            dataQuality:
              '{{expr:node("fetch-user-data").toolResult && node("fetch-order-data").toolResult ? "complete" : "partial"}}',
          },
        },
        script:
          'const input = arguments[0]; return { finalReport: { ...input, insights: { isHighValueCustomer: input.statistics.totalAmount > 1000, isActiveCustomer: input.statistics.totalOrders > 5, avgMonthlySpend: input.statistics.totalAmount / 12, customerSegment: input.statistics.totalAmount > 1000 ? "Premium" : input.statistics.totalAmount > 500 ? "Standard" : "Basic" } } };',
      },
    },
    {
      id: 'conditional-action',
      type: 'condition',
      label: '条件判断',
      position: { x: 1100, y: 250 },
      data: {
        // 使用表达式进行复杂条件判断
        condition:
          '{{expr:node("calculate-stats").userStats.totalAmount > 1000 && node("fetch-order-data").toolResult.orders.length > 3}}',
      },
    },
    {
      id: 'send-premium-offer',
      type: 'tool',
      label: '发送高级优惠',
      position: { x: 1300, y: 150 },
      data: {
        toolId: '{{NOTIFICATION_TOOL_ID}}',
        // 使用输入映射构建复杂的通知数据
        _inputMapping: {
          recipientEmail: '{{fetch-user-data.toolResult.email}}',
          recipientName: '{{fetch-user-data.toolResult.name}}',
          offerType: 'premium',
          personalizedMessage:
            '{{expr:"尊敬的 " + node("fetch-user-data").toolResult.name + "，感谢您的 " + node("calculate-stats").userStats.totalOrders + " 次购买！"}}',
          discountAmount:
            '{{expr:Math.min(node("calculate-stats").userStats.totalAmount * 0.1, 100)}}',
          validUntil:
            '{{expr:new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()}}',
        },
        description: '为高价值客户发送个性化优惠',
      },
    },
    {
      id: 'send-standard-offer',
      type: 'tool',
      label: '发送标准优惠',
      position: { x: 1300, y: 350 },
      data: {
        toolId: '{{NOTIFICATION_TOOL_ID}}',
        _inputMapping: {
          recipientEmail: '{{fetch-user-data.toolResult.email}}',
          recipientName: '{{fetch-user-data.toolResult.name}}',
          offerType: 'standard',
          personalizedMessage:
            '{{expr:"亲爱的 " + node("fetch-user-data").toolResult.name + "，我们为您准备了特别优惠！"}}',
          discountAmount:
            '{{expr:Math.min(node("calculate-stats").userStats.totalAmount * 0.05, 50)}}',
          validUntil:
            '{{expr:new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()}}',
        },
        description: '为普通客户发送标准优惠',
      },
    },
    {
      id: 'end',
      type: 'end',
      label: '结束',
      position: { x: 1500, y: 250 },
      data: {},
    },
  ] as WorkflowNode[],

  edges: [
    {
      id: 'start-to-user',
      source: 'start',
      target: 'fetch-user-data',
      label: '获取用户',
    },
    {
      id: 'user-to-order',
      source: 'fetch-user-data',
      target: 'fetch-order-data',
      label: '获取订单',
    },
    {
      id: 'order-to-stats',
      source: 'fetch-order-data',
      target: 'calculate-stats',
      label: '计算统计',
    },
    {
      id: 'stats-to-report',
      source: 'calculate-stats',
      target: 'generate-report',
      label: '生成报告',
    },
    {
      id: 'report-to-format',
      source: 'generate-report',
      target: 'format-output',
      label: '格式化输出',
    },
    {
      id: 'format-to-condition',
      source: 'format-output',
      target: 'conditional-action',
      label: '条件判断',
    },
    {
      id: 'condition-premium',
      source: 'conditional-action',
      target: 'send-premium-offer',
      label: '高价值客户',
      condition: 'conditionResult === true',
    },
    {
      id: 'condition-standard',
      source: 'conditional-action',
      target: 'send-standard-offer',
      label: '普通客户',
      condition: 'conditionResult === false',
    },
    {
      id: 'premium-to-end',
      source: 'send-premium-offer',
      target: 'end',
      label: '完成',
    },
    {
      id: 'standard-to-end',
      source: 'send-standard-offer',
      target: 'end',
      label: '完成',
    },
  ] as WorkflowEdge[],

  variables: {
    userId: '12345',
    reportLanguage: 'zh-CN',
  },

  triggers: [
    {
      type: 'manual',
      config: {},
    },
    {
      type: 'api',
      config: {
        endpoint: '/api/workflows/user-analysis',
        method: 'POST',
      },
    },
  ],
};
