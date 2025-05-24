import { Workflow, WorkflowStatus } from '../entities/workflow.entity';

export const llmWorkflowExample: Partial<Workflow> = {
  name: 'LLM节点示例工作流',
  description: '展示如何使用LLM节点进行文本处理、格式转换和多轮对话',
  status: WorkflowStatus.PUBLISHED,
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
      id: 'llm_text_analysis',
      type: 'llm',
      label: 'LLM文本分析',
      position: { x: 300, y: 100 },
      data: {
        modelName: 'gpt-3.5-turbo',
        systemPrompt:
          '你是一个专业的文本分析师，擅长分析文本的情感、主题和关键信息。',
        prompt:
          '请分析以下文本的情感倾向、主要主题和关键信息：\n\n{{inputText}}',
        temperature: 0.3,
        maxTokens: 500,
        outputFormat: 'json',
        extractFields: ['sentiment', 'theme', 'keywords'],
        timeout: 30000,
        retryAttempts: 3,
      },
    },
    {
      id: 'llm_format_converter',
      type: 'llm',
      label: 'LLM格式转换',
      position: { x: 500, y: 100 },
      data: {
        modelName: 'gpt-3.5-turbo',
        systemPrompt: '你是一个格式转换专家，能够将分析结果转换为指定的格式。',
        prompt: `请将以下分析结果转换为Markdown格式的报告：

分析结果：{{llm_text_analysis.llmResponse}}

要求：
1. 使用清晰的标题结构
2. 包含情感分析、主题分析和关键词提取三个部分
3. 使用表格展示关键信息
4. 添加总结部分`,
        temperature: 0.2,
        maxTokens: 800,
        outputFormat: 'markdown',
        transformScript: `
          // 对输出进行后处理
          return {
            formattedReport: output,
            wordCount: output.split(' ').length,
            timestamp: new Date().toISOString()
          };
        `,
      },
    },
    {
      id: 'llm_conversation',
      type: 'llm',
      label: 'LLM多轮对话',
      position: { x: 700, y: 100 },
      data: {
        modelName: 'gpt-4',
        systemPrompt:
          '你是一个友好的AI助手，能够基于之前的分析结果回答用户的问题。',
        enableConversation: true,
        conversationId: 'analysis_chat',
        conversationMaxHistory: 5,
        messages: [
          {
            role: 'assistant',
            content:
              '我已经完成了文本分析和格式转换。基于分析结果：{{llm_text_analysis.llmResponse}}，我可以回答您关于这个文本的任何问题。',
          },
          {
            role: 'user',
            content: '{{userQuestion}}',
          },
        ],
        temperature: 0.7,
        maxTokens: 600,
      },
    },
    {
      id: 'llm_summary',
      type: 'llm',
      label: 'LLM总结',
      position: { x: 900, y: 100 },
      data: {
        modelName: 'gpt-3.5-turbo',
        systemPrompt:
          '你是一个总结专家，能够将复杂的分析过程和结果总结为简洁明了的报告。',
        prompt: `请基于以下信息生成一个综合总结：

原始文本分析：{{llm_text_analysis.llmResponse}}
格式化报告：{{llm_format_converter.llmResponse}}
对话结果：{{llm_conversation.llmResponse}}

请生成一个包含以下内容的总结：
1. 分析过程概述
2. 主要发现
3. 建议和下一步行动`,
        temperature: 0.4,
        maxTokens: 400,
        outputFormat: 'text',
      },
    },
    {
      id: 'condition_check',
      type: 'condition',
      label: '条件检查',
      position: { x: 1100, y: 100 },
      data: {
        condition:
          '{{llm_text_analysis.extractedFields.sentiment}} === "positive"',
      },
    },
    {
      id: 'llm_positive_response',
      type: 'llm',
      label: 'LLM积极回应',
      position: { x: 1300, y: 50 },
      data: {
        modelName: 'gpt-3.5-turbo',
        systemPrompt: '你是一个乐观的AI助手，专门处理积极的内容。',
        prompt:
          '基于积极的分析结果，请生成一个鼓励性的回应：\n\n{{llm_summary.llmResponse}}',
        temperature: 0.8,
        maxTokens: 200,
      },
    },
    {
      id: 'llm_neutral_response',
      type: 'llm',
      label: 'LLM中性回应',
      position: { x: 1300, y: 150 },
      data: {
        modelName: 'gpt-3.5-turbo',
        systemPrompt: '你是一个客观的AI助手，专门处理中性或负面的内容。',
        prompt:
          '基于分析结果，请生成一个客观、建设性的回应：\n\n{{llm_summary.llmResponse}}',
        temperature: 0.5,
        maxTokens: 200,
      },
    },
    {
      id: 'end',
      type: 'end',
      label: '结束',
      position: { x: 1500, y: 100 },
      data: {},
    },
  ],
  edges: [
    {
      id: 'e1',
      source: 'start',
      target: 'llm_text_analysis',
    },
    {
      id: 'e2',
      source: 'llm_text_analysis',
      target: 'llm_format_converter',
    },
    {
      id: 'e3',
      source: 'llm_format_converter',
      target: 'llm_conversation',
    },
    {
      id: 'e4',
      source: 'llm_conversation',
      target: 'llm_summary',
    },
    {
      id: 'e5',
      source: 'llm_summary',
      target: 'condition_check',
    },
    {
      id: 'e6',
      source: 'condition_check',
      target: 'llm_positive_response',
      condition: 'true',
    },
    {
      id: 'e7',
      source: 'condition_check',
      target: 'llm_neutral_response',
      condition: 'false',
    },
    {
      id: 'e8',
      source: 'llm_positive_response',
      target: 'end',
    },
    {
      id: 'e9',
      source: 'llm_neutral_response',
      target: 'end',
    },
  ],
  variables: {
    inputText: {
      type: 'string',
      description: '要分析的输入文本',
      required: true,
      default: '今天是个美好的一天，我对新项目充满期待！',
    },
    userQuestion: {
      type: 'string',
      description: '用户想要询问的问题',
      required: false,
      default: '这个文本的主要情感是什么？',
    },
  },
};

// 复杂LLM处理工作流示例
export const complexLlmWorkflowExample: Partial<Workflow> = {
  name: '复杂LLM处理工作流',
  description: '展示LLM节点的高级功能：并行处理、循环处理和错误处理',
  status: WorkflowStatus.PUBLISHED,
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
      id: 'parallel_start',
      type: 'parallel_start',
      label: '并行开始',
      position: { x: 300, y: 200 },
      data: {
        parallelId: 'llm_parallel',
        strategy: 'wait_all',
        timeout: 60000,
        failureStrategy: 'continue_on_error',
      },
    },
    {
      id: 'branch_sentiment',
      type: 'parallel_branch',
      label: '情感分析分支',
      position: { x: 500, y: 100 },
      data: {
        parallelId: 'llm_parallel',
        branchName: 'sentiment_analysis',
      },
    },
    {
      id: 'llm_sentiment',
      type: 'llm',
      label: 'LLM情感分析',
      position: { x: 700, y: 100 },
      data: {
        modelName: 'gpt-3.5-turbo',
        systemPrompt: '你是情感分析专家，只返回JSON格式的结果。',
        prompt: '分析文本情感：{{inputText}}',
        outputFormat: 'json',
        extractFields: ['sentiment', 'confidence', 'emotions'],
        retryAttempts: 2,
        retryDelay: 1000,
      },
    },
    {
      id: 'branch_keywords',
      type: 'parallel_branch',
      label: '关键词提取分支',
      position: { x: 500, y: 200 },
      data: {
        parallelId: 'llm_parallel',
        branchName: 'keyword_extraction',
      },
    },
    {
      id: 'llm_keywords',
      type: 'llm',
      label: 'LLM关键词提取',
      position: { x: 700, y: 200 },
      data: {
        modelName: 'gpt-3.5-turbo',
        systemPrompt: '你是关键词提取专家，只返回JSON格式的结果。',
        prompt: '提取文本关键词：{{inputText}}',
        outputFormat: 'json',
        extractFields: ['keywords', 'topics', 'entities'],
        retryAttempts: 2,
        retryDelay: 1000,
      },
    },
    {
      id: 'branch_summary',
      type: 'parallel_branch',
      label: '摘要生成分支',
      position: { x: 500, y: 300 },
      data: {
        parallelId: 'llm_parallel',
        branchName: 'summary_generation',
      },
    },
    {
      id: 'llm_summary',
      type: 'llm',
      label: 'LLM摘要生成',
      position: { x: 700, y: 300 },
      data: {
        modelName: 'gpt-4',
        systemPrompt: '你是摘要生成专家，生成简洁准确的摘要。',
        prompt: '生成文本摘要：{{inputText}}',
        temperature: 0.3,
        maxTokens: 300,
        retryAttempts: 2,
        retryDelay: 1000,
      },
    },
    {
      id: 'parallel_end',
      type: 'parallel_end',
      label: '并行结束',
      position: { x: 900, y: 200 },
      data: {
        parallelId: 'llm_parallel',
        aggregationScript: `
          return {
            sentiment: context.sentiment_analysis?.llmResponse,
            keywords: context.keyword_extraction?.llmResponse,
            summary: context.summary_generation?.llmResponse,
            processingTime: new Date().toISOString()
          };
        `,
      },
    },
    {
      id: 'llm_integration',
      type: 'llm',
      label: 'LLM结果整合',
      position: { x: 1100, y: 200 },
      data: {
        modelName: 'gpt-4',
        systemPrompt: '你是数据整合专家，能够将多个分析结果整合为综合报告。',
        prompt: `请整合以下分析结果：

情感分析：{{parallel_end.sentiment}}
关键词提取：{{parallel_end.keywords}}
摘要：{{parallel_end.summary}}

生成一个综合的分析报告，包含：
1. 执行摘要
2. 详细分析
3. 关键发现
4. 建议`,
        temperature: 0.4,
        maxTokens: 800,
        outputFormat: 'markdown',
      },
    },
    {
      id: 'end',
      type: 'end',
      label: '结束',
      position: { x: 1300, y: 200 },
      data: {},
    },
  ],
  edges: [
    {
      id: 'e1',
      source: 'start',
      target: 'parallel_start',
    },
    {
      id: 'e2',
      source: 'parallel_start',
      target: 'branch_sentiment',
    },
    {
      id: 'e3',
      source: 'parallel_start',
      target: 'branch_keywords',
    },
    {
      id: 'e4',
      source: 'parallel_start',
      target: 'branch_summary',
    },
    {
      id: 'e5',
      source: 'branch_sentiment',
      target: 'llm_sentiment',
    },
    {
      id: 'e6',
      source: 'branch_keywords',
      target: 'llm_keywords',
    },
    {
      id: 'e7',
      source: 'branch_summary',
      target: 'llm_summary',
    },
    {
      id: 'e8',
      source: 'llm_sentiment',
      target: 'parallel_end',
    },
    {
      id: 'e9',
      source: 'llm_keywords',
      target: 'parallel_end',
    },
    {
      id: 'e10',
      source: 'llm_summary',
      target: 'parallel_end',
    },
    {
      id: 'e11',
      source: 'parallel_end',
      target: 'llm_integration',
    },
    {
      id: 'e12',
      source: 'llm_integration',
      target: 'end',
    },
  ],
  variables: {
    inputText: {
      type: 'string',
      description: '要分析的输入文本',
      required: true,
      default:
        '人工智能技术正在快速发展，为各行各业带来了前所未有的机遇和挑战。从自动驾驶汽车到智能医疗诊断，AI正在改变我们的生活方式。然而，我们也需要关注AI带来的伦理问题和就业影响。',
    },
  },
};
