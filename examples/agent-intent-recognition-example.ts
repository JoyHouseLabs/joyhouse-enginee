/**
 * Agent意图识别功能示例
 * 
 * 本示例展示如何配置和使用Agent的高级意图识别功能，
 * 包括工具调用、MCP工具调用和工作流触发。
 */

import { IntentRecognitionMode, IntentRecognitionConfig } from '../src/agent/dto/agent.dto';

// 1. 基础意图识别配置（仅工具调用）
export const basicIntentConfig: IntentRecognitionConfig = {
  mode: IntentRecognitionMode.BASIC,
  confidenceThreshold: 0.7,
  enableParameterExtraction: true,
  enableContextHistory: true,
  maxHistoryLength: 10,
  fallbackToTraditional: true,
  enabledActionTypes: ['tool']
};

// 2. 高级意图识别配置（工具+MCP+工作流）
export const advancedIntentConfig: IntentRecognitionConfig = {
  mode: IntentRecognitionMode.ADVANCED,
  confidenceThreshold: 0.8,
  enableParameterExtraction: true,
  enableContextHistory: true,
  maxHistoryLength: 15,
  fallbackToTraditional: true,
  enabledActionTypes: ['tool', 'mcp_tool', 'workflow'],
  customIntentCategories: [
    {
      id: 'data_analysis',
      name: '数据分析',
      description: '用户想要分析数据、生成报告或可视化',
      keywords: ['分析', '数据', '报告', '图表', '统计', '可视化'],
      actionType: 'workflow',
      actionId: 'data-analysis-workflow',
      requiredParameters: ['data_source', 'analysis_type']
    },
    {
      id: 'file_operations',
      name: '文件操作',
      description: '用户想要处理文件、上传、下载或转换',
      keywords: ['文件', '上传', '下载', '转换', '处理'],
      actionType: 'tool',
      actionId: 'file-processor-tool',
      requiredParameters: ['file_path', 'operation']
    },
    {
      id: 'web_search',
      name: '网络搜索',
      description: '用户想要搜索网络信息',
      keywords: ['搜索', '查找', '网上', '信息', '资料'],
      actionType: 'mcp_tool',
      actionId: 'web-search:search',
      requiredParameters: ['query']
    },
    {
      id: 'code_generation',
      name: '代码生成',
      description: '用户想要生成、修改或优化代码',
      keywords: ['代码', '编程', '函数', '脚本', '开发'],
      actionType: 'workflow',
      actionId: 'code-generation-workflow',
      requiredParameters: ['language', 'requirements']
    }
  ]
};

// 3. 仅工作流意图识别配置
export const workflowOnlyIntentConfig: IntentRecognitionConfig = {
  mode: IntentRecognitionMode.WORKFLOW_ONLY,
  confidenceThreshold: 0.75,
  enableParameterExtraction: true,
  enableContextHistory: true,
  maxHistoryLength: 8,
  fallbackToTraditional: true,
  enabledActionTypes: ['workflow']
};

// 4. 创建智能助手Agent示例
export const createSmartAssistantAgent = {
  name: "智能助手",
  description: "一个具备高级意图识别能力的智能助手，可以调用工具、MCP工具和工作流来满足用户需求",
  llmParams: {
    model: "gpt-4",
    temperature: 0.7,
    maxTokens: 2000,
    topP: 0.9
  },
  intentRecognition: advancedIntentConfig,
  enabledTools: [
    "file-processor-tool",
    "calculator-tool",
    "text-analyzer-tool",
    "image-generator-tool"
  ],
  enabledMcpTools: [
    "web-search:search",
    "web-search:summarize",
    "database:query",
    "api-client:request"
  ],
  enabledWorkflows: [
    "data-analysis-workflow",
    "code-generation-workflow",
    "document-processing-workflow",
    "customer-service-workflow"
  ],
  enableRealTimeMonitoring: true,
  metadata: {
    category: "general_assistant",
    version: "1.0.0",
    capabilities: ["intent_recognition", "tool_calling", "workflow_execution"],
    supportedLanguages: ["zh-CN", "en-US"]
  }
};

// 5. 创建专业数据分析师Agent示例
export const createDataAnalystAgent = {
  name: "数据分析师",
  description: "专门用于数据分析和可视化的智能助手",
  llmParams: {
    model: "gpt-4",
    temperature: 0.3,
    maxTokens: 1500
  },
  intentRecognition: {
    mode: IntentRecognitionMode.ADVANCED,
    confidenceThreshold: 0.85,
    enableParameterExtraction: true,
    enableContextHistory: true,
    maxHistoryLength: 20,
    fallbackToTraditional: false,
    enabledActionTypes: ['tool', 'workflow'],
    customIntentCategories: [
      {
        id: 'statistical_analysis',
        name: '统计分析',
        description: '执行统计分析和假设检验',
        keywords: ['统计', '分析', '检验', '相关性', '回归'],
        actionType: 'workflow',
        actionId: 'statistical-analysis-workflow',
        requiredParameters: ['data', 'analysis_method']
      },
      {
        id: 'data_visualization',
        name: '数据可视化',
        description: '创建图表和可视化',
        keywords: ['图表', '可视化', '绘图', '展示'],
        actionType: 'tool',
        actionId: 'chart-generator-tool',
        requiredParameters: ['data', 'chart_type']
      }
    ]
  },
  enabledTools: [
    "data-processor-tool",
    "chart-generator-tool",
    "statistical-tool"
  ],
  enabledWorkflows: [
    "data-analysis-workflow",
    "statistical-analysis-workflow",
    "data-visualization-workflow"
  ],
  enableRealTimeMonitoring: true
};

// 6. 意图识别测试用例
export const intentRecognitionTestCases = [
  {
    message: "帮我分析一下这个月的销售数据",
    expectedIntent: "data_analysis",
    expectedActionType: "workflow",
    expectedParameters: {
      data_source: "sales_data",
      time_period: "this_month"
    }
  },
  {
    message: "我想搜索一下最新的AI技术发展",
    expectedIntent: "web_search",
    expectedActionType: "mcp_tool",
    expectedParameters: {
      query: "最新AI技术发展"
    }
  },
  {
    message: "请帮我生成一个Python函数来计算斐波那契数列",
    expectedIntent: "code_generation",
    expectedActionType: "workflow",
    expectedParameters: {
      language: "python",
      requirements: "计算斐波那契数列的函数"
    }
  },
  {
    message: "转换这个PDF文件为Word格式",
    expectedIntent: "file_operations",
    expectedActionType: "tool",
    expectedParameters: {
      operation: "convert",
      source_format: "pdf",
      target_format: "word"
    }
  }
];

// 7. 使用示例代码
export const usageExample = `
// 创建Agent
const agent = await agentService.create(createSmartAssistantAgent, user);

// 测试意图识别
const testResult = await agentService.testIntentRecognition(agent.id, {
  message: "帮我分析一下这个月的销售数据",
  conversationHistory: [
    { role: "user", content: "你好" },
    { role: "assistant", content: "您好！我是智能助手，有什么可以帮您的吗？" }
  ]
}, user);

console.log('意图识别结果:', testResult);

// 进行对话（会自动触发意图识别和相应动作）
const chatResult = await agentService.chat(agent.id, conversation.id, {
  message: "帮我分析一下这个月的销售数据"
}, user);

console.log('对话结果:', chatResult);
console.log('执行的动作:', chatResult.actionResults);
`;

// 8. API调用示例
export const apiExamples = {
  // 创建Agent
  createAgent: {
    method: 'POST',
    url: '/api/agents',
    headers: {
      'Authorization': 'Bearer <your-jwt-token>',
      'Content-Type': 'application/json'
    },
    body: createSmartAssistantAgent
  },

  // 测试意图识别
  testIntentRecognition: {
    method: 'POST',
    url: '/api/agents/{agentId}/test-intent-recognition',
    headers: {
      'Authorization': 'Bearer <your-jwt-token>',
      'Content-Type': 'application/json'
    },
    body: {
      message: "帮我分析一下这个月的销售数据",
      conversationHistory: [
        { role: "user", content: "你好" },
        { role: "assistant", content: "您好！我是智能助手，有什么可以帮您的吗？" }
      ]
    }
  },

  // 进行对话
  chat: {
    method: 'POST',
    url: '/api/agents/{agentId}/conversations/{conversationId}/chat',
    headers: {
      'Authorization': 'Bearer <your-jwt-token>',
      'Content-Type': 'application/json'
    },
    body: {
      message: "帮我分析一下这个月的销售数据"
    }
  }
};

export default {
  basicIntentConfig,
  advancedIntentConfig,
  workflowOnlyIntentConfig,
  createSmartAssistantAgent,
  createDataAnalystAgent,
  intentRecognitionTestCases,
  usageExample,
  apiExamples
}; 