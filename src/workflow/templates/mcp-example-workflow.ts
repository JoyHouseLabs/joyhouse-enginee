import { Workflow, WorkflowStatus } from '../entities/workflow.entity';

// MCP工具基础使用示例
export const mcpBasicWorkflowTemplate: Partial<Workflow> = {
  name: 'MCP工具基础使用示例',
  description: '演示如何在工作流中使用MCP工具进行数据处理',
  status: WorkflowStatus.DRAFT,
  isTemplate: true,
  variables: {
    inputText: '需要处理的文本内容',
    outputFormat: 'json',
  },
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: '开始',
      position: { x: 100, y: 100 },
      data: {},
    },
    {
      id: 'mcp_text_analysis',
      type: 'mcp_tool',
      label: 'MCP文本分析',
      position: { x: 300, y: 100 },
      data: {
        mcpServerName: 'text-analysis-server',
        mcpToolName: 'analyze_text',
        mcpArguments: {
          text: '{{inputText}}',
          format: '{{outputFormat}}',
          include_sentiment: true,
          include_keywords: true,
        },
        mcpTimeout: 30000,
        mcpRetryAttempts: 3,
        mcpRetryDelay: 1000,
      },
    },
    {
      id: 'process_result',
      type: 'script',
      label: '处理分析结果',
      position: { x: 500, y: 100 },
      data: {
        script: `
          const analysis = context.mcpToolResult;
          return {
            summary: {
              sentiment: analysis.sentiment,
              keywordCount: analysis.keywords?.length || 0,
              confidence: analysis.confidence || 0,
              processedAt: new Date().toISOString()
            },
            fullAnalysis: analysis
          };
        `,
      },
    },
    {
      id: 'end',
      type: 'end',
      label: '结束',
      position: { x: 700, y: 100 },
      data: {},
    },
  ],
  edges: [
    {
      id: 'start-to-mcp',
      source: 'start',
      target: 'mcp_text_analysis',
      label: '开始分析',
    },
    {
      id: 'mcp-to-process',
      source: 'mcp_text_analysis',
      target: 'process_result',
      label: '处理结果',
    },
    {
      id: 'process-to-end',
      source: 'process_result',
      target: 'end',
      label: '完成',
    },
  ],
};

// MCP工具并行执行示例
export const mcpParallelWorkflowTemplate: Partial<Workflow> = {
  name: 'MCP工具并行执行示例',
  description: '演示如何并行执行多个MCP工具进行数据聚合',
  status: WorkflowStatus.DRAFT,
  isTemplate: true,
  variables: {
    query: '人工智能的发展趋势',
    language: 'zh-CN',
  },
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
        parallelId: 'data_collection',
        parallelStrategy: 'wait_all',
        parallelTimeout: 60000,
        failureStrategy: 'continue_on_error',
      },
    },
    {
      id: 'search_web',
      type: 'parallel_branch',
      label: '网络搜索',
      position: { x: 500, y: 100 },
      data: {
        parallelId: 'data_collection',
        branchName: 'webSearch',
      },
    },
    {
      id: 'mcp_web_search',
      type: 'mcp_tool',
      label: 'MCP网络搜索',
      position: { x: 700, y: 100 },
      data: {
        mcpServerName: 'web-search-server',
        mcpToolName: 'search_web',
        mcpArguments: {
          query: '{{query}}',
          language: '{{language}}',
          max_results: 10,
        },
        mcpTimeout: 30000,
        mcpRetryAttempts: 2,
      },
    },
    {
      id: 'analyze_news',
      type: 'parallel_branch',
      label: '新闻分析',
      position: { x: 500, y: 200 },
      data: {
        parallelId: 'data_collection',
        branchName: 'newsAnalysis',
      },
    },
    {
      id: 'mcp_news_analysis',
      type: 'mcp_tool',
      label: 'MCP新闻分析',
      position: { x: 700, y: 200 },
      data: {
        mcpServerName: 'news-analysis-server',
        mcpToolName: 'analyze_news_trends',
        mcpArguments: {
          topic: '{{query}}',
          timeframe: '7d',
          sources: ['tech', 'business', 'science'],
        },
        mcpTimeout: 45000,
        mcpRetryAttempts: 2,
      },
    },
    {
      id: 'get_market_data',
      type: 'parallel_branch',
      label: '市场数据',
      position: { x: 500, y: 300 },
      data: {
        parallelId: 'data_collection',
        branchName: 'marketData',
      },
    },
    {
      id: 'mcp_market_data',
      type: 'mcp_tool',
      label: 'MCP市场数据',
      position: { x: 700, y: 300 },
      data: {
        mcpServerName: 'market-data-server',
        mcpToolName: 'get_market_trends',
        mcpArguments: {
          sector: 'technology',
          metrics: ['growth', 'investment', 'innovation'],
          period: '1m',
        },
        mcpTimeout: 20000,
        mcpRetryAttempts: 3,
      },
    },
    {
      id: 'parallel_end',
      type: 'parallel_end',
      label: '并行结束',
      position: { x: 900, y: 200 },
      data: {
        parallelId: 'data_collection',
        aggregationScript: `
          const results = {
            webSearchResults: context.webSearch || null,
            newsAnalysis: context.newsAnalysis || null,
            marketData: context.marketData || null,
            timestamp: new Date().toISOString()
          };
          
          // 计算数据完整性
          const completedSources = Object.values(results).filter(r => r !== null).length - 1; // 减去timestamp
          results.dataCompleteness = completedSources / 3;
          
          return results;
        `,
      },
    },
    {
      id: 'generate_report',
      type: 'mcp_tool',
      label: '生成综合报告',
      position: { x: 1100, y: 200 },
      data: {
        mcpServerName: 'report-generator-server',
        mcpToolName: 'generate_comprehensive_report',
        mcpArguments: {
          data: '{{webSearchResults}}',
          news: '{{newsAnalysis}}',
          market: '{{marketData}}',
          topic: '{{query}}',
          format: 'markdown',
          include_charts: true,
        },
        mcpTimeout: 60000,
        mcpRetryAttempts: 2,
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
      id: 'start-to-parallel',
      source: 'start',
      target: 'parallel_start',
      label: '开始并行处理',
    },
    {
      id: 'parallel-to-search',
      source: 'parallel_start',
      target: 'search_web',
      label: '网络搜索分支',
    },
    {
      id: 'search-to-mcp-search',
      source: 'search_web',
      target: 'mcp_web_search',
      label: '执行搜索',
    },
    {
      id: 'parallel-to-news',
      source: 'parallel_start',
      target: 'analyze_news',
      label: '新闻分析分支',
    },
    {
      id: 'news-to-mcp-news',
      source: 'analyze_news',
      target: 'mcp_news_analysis',
      label: '执行新闻分析',
    },
    {
      id: 'parallel-to-market',
      source: 'parallel_start',
      target: 'get_market_data',
      label: '市场数据分支',
    },
    {
      id: 'market-to-mcp-market',
      source: 'get_market_data',
      target: 'mcp_market_data',
      label: '获取市场数据',
    },
    {
      id: 'mcp-search-to-parallel-end',
      source: 'mcp_web_search',
      target: 'parallel_end',
      label: '搜索完成',
    },
    {
      id: 'mcp-news-to-parallel-end',
      source: 'mcp_news_analysis',
      target: 'parallel_end',
      label: '新闻分析完成',
    },
    {
      id: 'mcp-market-to-parallel-end',
      source: 'mcp_market_data',
      target: 'parallel_end',
      label: '市场数据完成',
    },
    {
      id: 'parallel-end-to-report',
      source: 'parallel_end',
      target: 'generate_report',
      label: '生成报告',
    },
    {
      id: 'report-to-end',
      source: 'generate_report',
      target: 'end',
      label: '完成',
    },
  ],
};

// MCP工具条件执行示例
export const mcpConditionalWorkflowTemplate: Partial<Workflow> = {
  name: 'MCP工具条件执行示例',
  description: '根据条件选择不同的MCP工具进行处理',
  status: WorkflowStatus.DRAFT,
  isTemplate: true,
  variables: {
    inputType: 'text', // text, image, audio, video
    content: '待处理的内容',
  },
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: '开始',
      position: { x: 100, y: 200 },
      data: {},
    },
    {
      id: 'check_input_type',
      type: 'condition',
      label: '检查输入类型',
      position: { x: 300, y: 200 },
      data: {
        condition: 'context.inputType',
      },
    },
    {
      id: 'process_text',
      type: 'mcp_tool',
      label: '处理文本',
      position: { x: 500, y: 100 },
      data: {
        mcpServerName: 'text-processor-server',
        mcpToolName: 'process_text',
        mcpArguments: {
          text: '{{content}}',
          operations: ['clean', 'tokenize', 'analyze'],
        },
        mcpTimeout: 30000,
      },
    },
    {
      id: 'process_image',
      type: 'mcp_tool',
      label: '处理图像',
      position: { x: 500, y: 200 },
      data: {
        mcpServerName: 'image-processor-server',
        mcpToolName: 'process_image',
        mcpArguments: {
          image_data: '{{content}}',
          operations: ['resize', 'enhance', 'extract_text'],
        },
        mcpTimeout: 60000,
      },
    },
    {
      id: 'process_audio',
      type: 'mcp_tool',
      label: '处理音频',
      position: { x: 500, y: 300 },
      data: {
        mcpServerName: 'audio-processor-server',
        mcpToolName: 'process_audio',
        mcpArguments: {
          audio_data: '{{content}}',
          operations: ['transcribe', 'analyze_sentiment', 'extract_keywords'],
        },
        mcpTimeout: 120000,
      },
    },
    {
      id: 'merge_results',
      type: 'script',
      label: '合并结果',
      position: { x: 700, y: 200 },
      data: {
        script: `
          return {
            processedContent: context.mcpToolResult,
            inputType: context.inputType,
            processingTime: new Date().toISOString(),
            success: true
          };
        `,
      },
    },
    {
      id: 'end',
      type: 'end',
      label: '结束',
      position: { x: 900, y: 200 },
      data: {},
    },
  ],
  edges: [
    {
      id: 'start-to-check',
      source: 'start',
      target: 'check_input_type',
      label: '检查类型',
    },
    {
      id: 'check-to-text',
      source: 'check_input_type',
      target: 'process_text',
      label: '文本处理',
      condition: 'context.inputType === "text"',
    },
    {
      id: 'check-to-image',
      source: 'check_input_type',
      target: 'process_image',
      label: '图像处理',
      condition: 'context.inputType === "image"',
    },
    {
      id: 'check-to-audio',
      source: 'check_input_type',
      target: 'process_audio',
      label: '音频处理',
      condition: 'context.inputType === "audio"',
    },
    {
      id: 'text-to-merge',
      source: 'process_text',
      target: 'merge_results',
      label: '合并文本结果',
    },
    {
      id: 'image-to-merge',
      source: 'process_image',
      target: 'merge_results',
      label: '合并图像结果',
    },
    {
      id: 'audio-to-merge',
      source: 'process_audio',
      target: 'merge_results',
      label: '合并音频结果',
    },
    {
      id: 'merge-to-end',
      source: 'merge_results',
      target: 'end',
      label: '完成',
    },
  ],
};
