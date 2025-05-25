import { WorkflowNode, WorkflowEdge } from '../entities/workflow.entity';

export const btcTradingWorkflowTemplate = {
  name: 'BTC价格监控与自动交易工作流',
  description: '监控BTC价格，当价格低于9万时买入，高于11万时卖出',
  isTemplate: true,
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: '开始监控',
      position: { x: 100, y: 200 },
      data: {},
    },
    {
      id: 'init-monitoring',
      type: 'script',
      label: '初始化监控参数',
      position: { x: 300, y: 200 },
      data: {
        script: `
          const monitoringConfig = {
            buyThreshold: 90000,    // 9万美元买入阈值
            sellThreshold: 110000,  // 11万美元卖出阈值
            monitoringPeriod: 30,   // 监控30天
            checkInterval: 300000,  // 5分钟检查一次
            startTime: new Date(),
            endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后
            tradingEnabled: true,
            maxTradeAmount: 0.1,    // 最大交易0.1 BTC
            riskLevel: 'medium'
          };
          
          console.log('BTC交易监控已启动:', monitoringConfig);
          return { monitoringConfig };
        `,
      },
    },
    {
      id: 'loop-start',
      type: 'loop_start',
      label: '开始价格监控循环',
      position: { x: 500, y: 200 },
      data: {
        loopId: 'btc-monitoring-loop',
        maxIterations: 8640, // 30天 * 24小时 * 12次/小时
        exitCondition: 'new Date() > monitoringConfig.endTime || userInput === "stop"',
        exitKeyword: 'stop',
        exitEventType: 'monitoring_stop',
        exitEventCondition: 'eventData.reason === "manual_stop"',
      },
    },
    {
      id: 'get-btc-price',
      type: 'tool',
      label: '获取当前BTC价格',
      position: { x: 700, y: 200 },
      data: {
        toolId: '{{BTC_PRICE_TOOL_ID}}',
        description: '从交易所API获取实时BTC价格',
        timeout: 30000,
        retryAttempts: 3,
      },
    },
    {
      id: 'analyze-price',
      type: 'agent',
      label: '价格分析Agent',
      position: { x: 900, y: 200 },
      data: {
        agentId: '{{PRICE_ANALYSIS_AGENT_ID}}',
        message: `
          请分析当前BTC价格数据：
          - 当前价格: $\${toolResult.price}
          - 24小时变化: \${toolResult.change24h}%
          - 交易量: \${toolResult.volume}
          - 买入阈值: $\${monitoringConfig.buyThreshold}
          - 卖出阈值: $\${monitoringConfig.sellThreshold}
          
          请提供：
          1. 价格趋势分析
          2. 是否触发交易条件
          3. 风险评估
          4. 交易建议
        `,
        temperature: 0.3,
        maxTokens: 1000,
      },
    },
    {
      id: 'check-trading-conditions',
      type: 'condition',
      label: '检查交易条件',
      position: { x: 1100, y: 200 },
      data: {
        conditionType: 'smart_router',
        routingRules: [
          {
            id: 'buy-condition',
            name: '买入条件',
            targetNodeId: 'execute-buy-order',
            condition: 'toolResult.price <= monitoringConfig.buyThreshold && monitoringConfig.tradingEnabled',
            priority: 1,
            weight: 1.0,
            enabled: true,
          },
          {
            id: 'sell-condition',
            name: '卖出条件',
            targetNodeId: 'execute-sell-order',
            condition: 'toolResult.price >= monitoringConfig.sellThreshold && monitoringConfig.tradingEnabled',
            priority: 1,
            weight: 1.0,
            enabled: true,
          },
          {
            id: 'hold-condition',
            name: '持有条件',
            targetNodeId: 'log-price-update',
            condition: 'toolResult.price > monitoringConfig.buyThreshold && toolResult.price < monitoringConfig.sellThreshold',
            priority: 2,
            weight: 1.0,
            enabled: true,
          },
        ],
        defaultTargetNodeId: 'log-price-update',
        debugMode: true,
      },
    },
    {
      id: 'execute-buy-order',
      type: 'agent',
      label: '执行买入订单',
      position: { x: 1300, y: 100 },
      data: {
        agentId: '{{TRADING_AGENT_ID}}',
        message: `
          执行BTC买入订单：
          - 当前价格: $\${toolResult.price}
          - 买入金额: $\${monitoringConfig.maxTradeAmount * toolResult.price}
          - 风险级别: \${monitoringConfig.riskLevel}
          
          请确认并执行买入操作。
        `,
        enabledTools: ['{{BTC_BUY_TOOL_ID}}'],
        temperature: 0.1,
      },
    },
    {
      id: 'execute-sell-order',
      type: 'agent',
      label: '执行卖出订单',
      position: { x: 1300, y: 300 },
      data: {
        agentId: '{{TRADING_AGENT_ID}}',
        message: `
          执行BTC卖出订单：
          - 当前价格: $\${toolResult.price}
          - 卖出数量: \${monitoringConfig.maxTradeAmount} BTC
          - 风险级别: \${monitoringConfig.riskLevel}
          
          请确认并执行卖出操作。
        `,
        enabledTools: ['{{BTC_SELL_TOOL_ID}}'],
        temperature: 0.1,
      },
    },
    {
      id: 'log-price-update',
      type: 'script',
      label: '记录价格更新',
      position: { x: 1300, y: 200 },
      data: {
        script: `
          const priceLog = {
            timestamp: new Date().toISOString(),
            price: toolResult.price,
            change24h: toolResult.change24h,
            volume: toolResult.volume,
            iteration: context.currentIteration,
            action: 'monitor',
            buyThreshold: monitoringConfig.buyThreshold,
            sellThreshold: monitoringConfig.sellThreshold,
            status: 'holding'
          };
          
          console.log(\`BTC价格监控 #\${context.currentIteration}: $\${toolResult.price} (24h: \${toolResult.change24h}%)\`);
          
          return { priceLog };
        `,
      },
    },
    {
      id: 'send-notification',
      type: 'agent',
      label: '发送交易通知',
      position: { x: 1500, y: 150 },
      data: {
        agentId: '{{NOTIFICATION_AGENT_ID}}',
        message: `
          发送交易执行通知：
          \${agentResponse ? '交易已执行: ' + agentResponse : '价格监控更新: $' + toolResult.price}
          
          请通过适当的渠道发送通知。
        `,
        enabledTools: ['{{EMAIL_TOOL_ID}}', '{{WEBHOOK_TOOL_ID}}'],
      },
    },
    {
      id: 'risk-assessment',
      type: 'agent',
      label: '风险评估',
      position: { x: 1700, y: 200 },
      data: {
        agentId: '{{RISK_ASSESSMENT_AGENT_ID}}',
        message: `
          请评估当前交易风险：
          - 当前价格: $\${toolResult.price}
          - 最近交易: \${agentResponse || '无'}
          - 市场波动: \${toolResult.change24h}%
          - 交易量: \${toolResult.volume}
          
          请提供风险评估和建议。
        `,
        temperature: 0.2,
      },
    },
    {
      id: 'wait-interval',
      type: 'delay',
      label: '等待下次检查',
      position: { x: 1900, y: 200 },
      data: {
        delayMs: 300000, // 5分钟间隔
        description: '等待5分钟后进行下次价格检查',
      },
    },
    {
      id: 'loop-condition',
      type: 'loop_condition',
      label: '检查循环条件',
      position: { x: 2100, y: 200 },
      data: {
        loopId: 'btc-monitoring-loop',
        condition: 'new Date() <= monitoringConfig.endTime && userInput !== "stop" && currentIteration < maxIterations',
      },
    },
    {
      id: 'loop-end',
      type: 'loop_end',
      label: '循环结束检查',
      position: { x: 2300, y: 200 },
      data: {
        loopId: 'btc-monitoring-loop',
      },
    },
    {
      id: 'generate-final-report',
      type: 'agent',
      label: '生成最终报告',
      position: { x: 2500, y: 200 },
      data: {
        agentId: '{{REPORT_AGENT_ID}}',
        message: `
          生成BTC交易监控最终报告：
          - 监控期间: \${monitoringConfig.startTime} 到 \${new Date()}
          - 总监控次数: \${context.currentIteration}
          - 执行的交易: [从context中提取交易记录]
          - 价格范围: [从context中提取价格数据]
          
          请生成详细的监控和交易报告。
        `,
        temperature: 0.3,
      },
    },
    {
      id: 'end',
      type: 'end',
      label: '监控结束',
      position: { x: 2700, y: 200 },
      data: {},
    },
  ] as WorkflowNode[],

  edges: [
    {
      id: 'start-to-init',
      source: 'start',
      target: 'init-monitoring',
      label: '初始化',
    },
    {
      id: 'init-to-loop',
      source: 'init-monitoring',
      target: 'loop-start',
      label: '开始循环',
    },
    {
      id: 'loop-to-price',
      source: 'loop-start',
      target: 'get-btc-price',
      label: '获取价格',
    },
    {
      id: 'price-to-analyze',
      source: 'get-btc-price',
      target: 'analyze-price',
      label: '分析价格',
    },
    {
      id: 'analyze-to-check',
      source: 'analyze-price',
      target: 'check-trading-conditions',
      label: '检查条件',
    },
    {
      id: 'check-to-buy',
      source: 'check-trading-conditions',
      target: 'execute-buy-order',
      label: '买入条件',
      condition: 'toolResult.price <= monitoringConfig.buyThreshold',
    },
    {
      id: 'check-to-sell',
      source: 'check-trading-conditions',
      target: 'execute-sell-order',
      label: '卖出条件',
      condition: 'toolResult.price >= monitoringConfig.sellThreshold',
    },
    {
      id: 'check-to-log',
      source: 'check-trading-conditions',
      target: 'log-price-update',
      label: '持有条件',
      condition: 'toolResult.price > monitoringConfig.buyThreshold && toolResult.price < monitoringConfig.sellThreshold',
    },
    {
      id: 'buy-to-notify',
      source: 'execute-buy-order',
      target: 'send-notification',
      label: '买入通知',
    },
    {
      id: 'sell-to-notify',
      source: 'execute-sell-order',
      target: 'send-notification',
      label: '卖出通知',
    },
    {
      id: 'log-to-notify',
      source: 'log-price-update',
      target: 'send-notification',
      label: '状态通知',
    },
    {
      id: 'notify-to-risk',
      source: 'send-notification',
      target: 'risk-assessment',
      label: '风险评估',
    },
    {
      id: 'risk-to-wait',
      source: 'risk-assessment',
      target: 'wait-interval',
      label: '等待间隔',
    },
    {
      id: 'wait-to-condition',
      source: 'wait-interval',
      target: 'loop-condition',
      label: '检查条件',
    },
    {
      id: 'condition-to-end',
      source: 'loop-condition',
      target: 'loop-end',
      label: '评估退出',
    },
    {
      id: 'loop-continue',
      source: 'loop-end',
      target: 'get-btc-price',
      label: '继续监控',
      condition: 'loopContinued === true',
    },
    {
      id: 'loop-exit',
      source: 'loop-end',
      target: 'generate-final-report',
      label: '退出循环',
      condition: 'loopExited === true',
    },
    {
      id: 'report-to-end',
      source: 'generate-final-report',
      target: 'end',
      label: '完成',
    },
  ] as WorkflowEdge[],

  variables: {
    buyThreshold: 90000,
    sellThreshold: 110000,
    monitoringPeriod: 30,
    maxTradeAmount: 0.1,
    riskLevel: 'medium',
    tradingEnabled: true,
  },

  triggers: [
    {
      type: 'manual',
      config: {},
    },
    {
      type: 'schedule',
      config: {
        cron: '0 9 * * *', // 每天上午9点自动启动
      },
    },
    {
      type: 'event',
      config: {
        eventType: 'btc_price_change',
        eventCondition: 'price <= 90000 || price >= 110000',
      },
    },
    {
      type: 'webhook',
      config: {
        webhook: '/api/webhook/btc-trading-start',
      },
    },
  ],
}; 