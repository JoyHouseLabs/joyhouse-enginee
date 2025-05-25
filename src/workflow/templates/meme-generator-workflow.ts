import { WorkflowNode, WorkflowEdge } from '../entities/workflow.entity';

export const memeGeneratorWorkflowTemplate = {
  name: 'Meme图生成工作流',
  description: '从网络获取最新热点词，结合当日天气，生成一个meme图',
  isTemplate: true,
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: '开始',
      position: { x: 100, y: 100 },
      data: {},
    },
    {
      id: 'get-trending-news',
      type: 'tool',
      label: '获取热点新闻',
      position: { x: 300, y: 100 },
      data: {
        toolId: '{{TRENDING_NEWS_TOOL_ID}}', // 需要替换为实际的工具ID
        description: '获取当前热点新闻关键词',
      },
    },
    {
      id: 'get-weather',
      type: 'tool',
      label: '获取天气信息',
      position: { x: 500, y: 100 },
      data: {
        toolId: '{{WEATHER_TOOL_ID}}', // 需要替换为实际的工具ID
        location: '{{location}}', // 从变量中获取位置
        description: '获取指定位置的天气信息',
      },
    },
    {
      id: 'wait-btc-price',
      type: 'wait_event',
      label: '等待BTC价格条件',
      position: { x: 700, y: 100 },
      data: {
        eventType: 'btc_price_change',
        eventCondition: 'eventData.price < 80000',
        description: '等待BTC价格低于8万美金',
      },
    },
    {
      id: 'user-approval',
      type: 'approval',
      label: '用户审批',
      position: { x: 900, y: 100 },
      data: {
        approvers: ['{{userId}}'],
        prompt: '是否继续生成meme图？',
        description: '等待用户确认是否继续',
      },
    },
    {
      id: 'check-approval',
      type: 'condition',
      label: '检查审批结果',
      position: { x: 1100, y: 100 },
      data: {
        condition: 'approved === true',
        description: '检查用户是否批准继续',
      },
    },
    {
      id: 'generate-meme-prompt',
      type: 'script',
      label: '生成Meme提示词',
      position: { x: 1300, y: 100 },
      data: {
        script: `
          const trendingKeywords = context.toolResult?.keywords || [];
          const weather = context.toolResult?.weather || {};
          const btcPrice = context.eventData?.price || 0;
          
          const prompt = \`创建一个有趣的meme图，结合以下元素：
          - 热点关键词: \${trendingKeywords.join(', ')}
          - 天气: \${weather.condition}, \${weather.temperature}°C
          - BTC价格: $\${btcPrice}
          请生成一个幽默且相关的meme图片\`;
          
          return { memePrompt: prompt };
        `,
        description: '结合热点词、天气和BTC价格生成meme提示词',
      },
    },
    {
      id: 'generate-meme',
      type: 'agent',
      label: '生成Meme图',
      position: { x: 1500, y: 100 },
      data: {
        agentId: '{{MEME_AGENT_ID}}', // 需要替换为实际的Agent ID
        message: '{{memePrompt}}',
        description: '使用AI Agent生成meme图',
      },
    },
    {
      id: 'user-feedback',
      type: 'user_input',
      label: '用户反馈',
      position: { x: 1700, y: 100 },
      data: {
        prompt: '请对生成的meme图进行评价或提出修改建议',
        timeout: 300000, // 5分钟超时
        description: '等待用户对生成结果的反馈',
      },
    },
    {
      id: 'check-satisfaction',
      type: 'condition',
      label: '检查满意度',
      position: { x: 1900, y: 100 },
      data: {
        condition: 'satisfaction >= 8 || retryCount >= 3',
        description: '检查用户满意度或重试次数',
      },
    },
    {
      id: 'end-success',
      type: 'end',
      label: '成功结束',
      position: { x: 2100, y: 50 },
      data: {},
    },
    {
      id: 'end-cancelled',
      type: 'end',
      label: '取消结束',
      position: { x: 1100, y: 200 },
      data: {},
    },
  ] as WorkflowNode[],

  edges: [
    {
      id: 'start-to-news',
      source: 'start',
      target: 'get-trending-news',
      label: '开始获取数据',
    },
    {
      id: 'news-to-weather',
      source: 'get-trending-news',
      target: 'get-weather',
      label: '获取天气',
    },
    {
      id: 'weather-to-btc',
      source: 'get-weather',
      target: 'wait-btc-price',
      label: '等待BTC条件',
    },
    {
      id: 'btc-to-approval',
      source: 'wait-btc-price',
      target: 'user-approval',
      label: '请求审批',
    },
    {
      id: 'approval-to-check',
      source: 'user-approval',
      target: 'check-approval',
      label: '检查结果',
    },
    {
      id: 'approved-to-prompt',
      source: 'check-approval',
      target: 'generate-meme-prompt',
      label: '已批准',
      condition: 'approved === true',
    },
    {
      id: 'rejected-to-end',
      source: 'check-approval',
      target: 'end-cancelled',
      label: '已拒绝',
      condition: 'approved === false',
    },
    {
      id: 'prompt-to-meme',
      source: 'generate-meme-prompt',
      target: 'generate-meme',
      label: '生成图片',
    },
    {
      id: 'meme-to-feedback',
      source: 'generate-meme',
      target: 'user-feedback',
      label: '等待反馈',
    },
    {
      id: 'feedback-to-check',
      source: 'user-feedback',
      target: 'check-satisfaction',
      label: '检查满意度',
    },
    {
      id: 'satisfied-to-end',
      source: 'check-satisfaction',
      target: 'end-success',
      label: '满意/达到重试上限',
      condition: 'satisfaction >= 8 || retryCount >= 3',
    },
    {
      id: 'retry-to-prompt',
      source: 'check-satisfaction',
      target: 'generate-meme-prompt',
      label: '重新生成',
      condition: 'satisfaction < 8 && retryCount < 3',
    },
  ] as WorkflowEdge[],

  variables: {
    location: 'Beijing',
    retryCount: 0,
    maxRetries: 3,
    userId: '{{userId}}', // 需要替换为实际用户ID
  },

  triggers: [
    {
      type: 'manual',
      config: {},
    },
    {
      type: 'schedule',
      config: {
        cron: '0 9 * * *', // 每天早上9点自动执行
      },
    },
    {
      type: 'event',
      config: {
        eventType: 'trending_news',
        eventCondition: 'keywords.length > 5', // 当热点词超过5个时触发
      },
    },
  ],
};
