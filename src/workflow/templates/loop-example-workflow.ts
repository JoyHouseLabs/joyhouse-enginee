import { WorkflowNode, WorkflowEdge } from '../entities/workflow.entity';

export const loopExampleWorkflowTemplate = {
  name: '循环监控工作流',
  description: '持续监控BTC价格和天气，直到用户输入"stop"或BTC价格超过10万美金',
  isTemplate: true,
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: '开始',
      position: { x: 100, y: 200 },
      data: {}
    },
    {
      id: 'loop-start',
      type: 'loop_start',
      label: '开始循环',
      position: { x: 300, y: 200 },
      data: {
        loopId: 'monitoring-loop',
        maxIterations: 1000,
        exitCondition: 'userInput === "stop" || btcPrice > 100000',
        exitKeyword: 'stop',
        exitEventType: 'btc_price_change',
        exitEventCondition: 'eventData.price > 100000'
      }
    },
    {
      id: 'get-btc-price',
      type: 'tool',
      label: '获取BTC价格',
      position: { x: 500, y: 150 },
      data: {
        toolId: '{{BTC_PRICE_TOOL_ID}}',
        description: '获取当前BTC价格'
      }
    },
    {
      id: 'get-weather',
      type: 'tool',
      label: '获取天气',
      position: { x: 500, y: 250 },
      data: {
        toolId: '{{WEATHER_TOOL_ID}}',
        location: '{{location}}',
        description: '获取当前天气信息'
      }
    },
    {
      id: 'generate-report',
      type: 'script',
      label: '生成监控报告',
      position: { x: 700, y: 200 },
      data: {
        script: `
          const btcPrice = context.toolResult?.btcPrice || 0;
          const weather = context.toolResult?.weather || {};
          const iteration = context.currentIteration || 1;
          
          const report = {
            timestamp: new Date().toISOString(),
            iteration: iteration,
            btcPrice: btcPrice,
            weather: weather,
            alert: btcPrice > 90000 ? 'BTC价格接近10万美金!' : null
          };
          
          console.log(\`监控报告 #\${iteration}: BTC $\${btcPrice}, 天气: \${weather.condition}\`);
          
          return { 
            monitoringReport: report,
            btcPrice: btcPrice
          };
        `
      }
    },
    {
      id: 'check-alert',
      type: 'condition',
      label: '检查是否需要告警',
      position: { x: 900, y: 200 },
      data: {
        condition: 'btcPrice > 90000'
      }
    },
    {
      id: 'send-alert',
      type: 'agent',
      label: '发送告警',
      position: { x: 1100, y: 150 },
      data: {
        agentId: '{{ALERT_AGENT_ID}}',
        message: '⚠️ 告警：BTC价格已达到 ${{btcPrice}}，接近10万美金阈值！',
        description: '发送价格告警通知'
      }
    },
    {
      id: 'wait-user-input',
      type: 'user_input',
      label: '等待用户指令',
      position: { x: 1100, y: 250 },
      data: {
        prompt: '监控进行中... 输入"stop"停止监控，或输入其他内容继续',
        timeout: 30000, // 30秒超时
        description: '等待用户输入控制指令'
      }
    },
    {
      id: 'delay',
      type: 'delay',
      label: '等待间隔',
      position: { x: 1300, y: 200 },
      data: {
        delayMs: 60000, // 1分钟间隔
        description: '等待1分钟后继续下一轮监控'
      }
    },
    {
      id: 'loop-condition',
      type: 'loop_condition',
      label: '检查循环条件',
      position: { x: 1500, y: 200 },
      data: {
        loopId: 'monitoring-loop',
        condition: 'userInput !== "stop" && btcPrice <= 100000 && currentIteration < maxIterations'
      }
    },
    {
      id: 'loop-end',
      type: 'loop_end',
      label: '循环结束检查',
      position: { x: 1700, y: 200 },
      data: {
        loopId: 'monitoring-loop'
      }
    },
    {
      id: 'final-report',
      type: 'script',
      label: '生成最终报告',
      position: { x: 1900, y: 200 },
      data: {
        script: `
          const loops = context.loops || {};
          const monitoringLoop = loops['monitoring-loop'];
          const totalIterations = monitoringLoop?.currentIteration || 0;
          
          return {
            finalReport: {
              totalIterations: totalIterations,
              endTime: new Date().toISOString(),
              reason: context.exitReason || 'unknown'
            }
          };
        `
      }
    },
    {
      id: 'end',
      type: 'end',
      label: '结束',
      position: { x: 2100, y: 200 },
      data: {}
    }
  ] as WorkflowNode[],
  
  edges: [
    {
      id: 'start-to-loop',
      source: 'start',
      target: 'loop-start',
      label: '开始监控'
    },
    {
      id: 'loop-start-to-btc',
      source: 'loop-start',
      target: 'get-btc-price',
      label: '获取价格'
    },
    {
      id: 'btc-to-weather',
      source: 'get-btc-price',
      target: 'get-weather',
      label: '获取天气'
    },
    {
      id: 'weather-to-report',
      source: 'get-weather',
      target: 'generate-report',
      label: '生成报告'
    },
    {
      id: 'report-to-check',
      source: 'generate-report',
      target: 'check-alert',
      label: '检查告警'
    },
    {
      id: 'alert-yes',
      source: 'check-alert',
      target: 'send-alert',
      label: '需要告警',
      condition: 'btcPrice > 90000'
    },
    {
      id: 'alert-no',
      source: 'check-alert',
      target: 'wait-user-input',
      label: '无需告警',
      condition: 'btcPrice <= 90000'
    },
    {
      id: 'alert-to-input',
      source: 'send-alert',
      target: 'wait-user-input',
      label: '等待用户'
    },
    {
      id: 'input-to-delay',
      source: 'wait-user-input',
      target: 'delay',
      label: '继续监控'
    },
    {
      id: 'delay-to-condition',
      source: 'delay',
      target: 'loop-condition',
      label: '检查条件'
    },
    {
      id: 'condition-to-end',
      source: 'loop-condition',
      target: 'loop-end',
      label: '评估退出'
    },
    {
      id: 'loop-continue',
      source: 'loop-end',
      target: 'loop-start',
      label: '继续循环',
      condition: 'loopContinued === true'
    },
    {
      id: 'loop-exit',
      source: 'loop-end',
      target: 'final-report',
      label: '退出循环',
      condition: 'loopExited === true'
    },
    {
      id: 'report-to-end',
      source: 'final-report',
      target: 'end',
      label: '完成'
    }
  ] as WorkflowEdge[],
  
  variables: {
    location: 'Beijing',
    alertThreshold: 90000,
    monitoringInterval: 60000
  },
  
  triggers: [
    {
      type: 'manual',
      config: {}
    },
    {
      type: 'schedule',
      config: {
        cron: '0 */6 * * *' // 每6小时自动启动监控
      }
    },
    {
      type: 'event',
      config: {
        eventType: 'btc_price_change',
        eventCondition: 'price > 80000' // BTC价格超过8万时启动监控
      }
    }
  ]
};

// 简单循环示例
export const simpleLoopWorkflowTemplate = {
  name: '简单计数循环',
  description: '简单的计数循环，从1数到10',
  isTemplate: true,
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: '开始',
      position: { x: 100, y: 100 },
      data: {}
    },
    {
      id: 'init-counter',
      type: 'script',
      label: '初始化计数器',
      position: { x: 300, y: 100 },
      data: {
        script: 'return { counter: 0 };'
      }
    },
    {
      id: 'loop-start',
      type: 'loop_start',
      label: '循环开始',
      position: { x: 500, y: 100 },
      data: {
        loopId: 'counter-loop',
        maxIterations: 10,
        exitCondition: 'counter >= 10'
      }
    },
    {
      id: 'increment',
      type: 'script',
      label: '递增计数器',
      position: { x: 700, y: 100 },
      data: {
        script: `
          const currentCounter = context.counter || 0;
          const newCounter = currentCounter + 1;
          console.log(\`计数: \${newCounter}\`);
          return { counter: newCounter };
        `
      }
    },
    {
      id: 'loop-end',
      type: 'loop_end',
      label: '循环结束',
      position: { x: 900, y: 100 },
      data: {
        loopId: 'counter-loop'
      }
    },
    {
      id: 'end',
      type: 'end',
      label: '结束',
      position: { x: 1100, y: 100 },
      data: {}
    }
  ] as WorkflowNode[],
  
  edges: [
    {
      id: 'start-to-init',
      source: 'start',
      target: 'init-counter'
    },
    {
      id: 'init-to-loop',
      source: 'init-counter',
      target: 'loop-start'
    },
    {
      id: 'loop-to-increment',
      source: 'loop-start',
      target: 'increment'
    },
    {
      id: 'increment-to-end',
      source: 'increment',
      target: 'loop-end'
    },
    {
      id: 'loop-exit',
      source: 'loop-end',
      target: 'end',
      condition: 'loopExited === true'
    }
  ] as WorkflowEdge[],
  
  variables: {},
  triggers: [{ type: 'manual', config: {} }]
};

// 并发数据获取工作流示例
export const parallelDataFetchWorkflowTemplate = {
  name: '并发数据获取工作流',
  description: '同时从多个数据源获取信息，然后汇总分析',
  isTemplate: true,
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: '开始',
      position: { x: 100, y: 200 },
      data: {}
    },
    {
      id: 'parallel-start',
      type: 'parallel_start',
      label: '开始并发获取',
      position: { x: 300, y: 200 },
      data: {
        parallelId: 'data-fetch',
        parallelStrategy: 'wait_all',
        parallelTimeout: 30000,
        failureStrategy: 'continue_on_error'
      }
    },
    {
      id: 'fetch-weather',
      type: 'parallel_branch',
      label: '获取天气数据',
      position: { x: 500, y: 100 },
      data: {
        parallelId: 'data-fetch',
        branchName: 'weather',
        toolId: '{{WEATHER_TOOL_ID}}',
        location: '{{location}}'
      }
    },
    {
      id: 'fetch-btc-price',
      type: 'parallel_branch',
      label: '获取BTC价格',
      position: { x: 500, y: 200 },
      data: {
        parallelId: 'data-fetch',
        branchName: 'btcPrice',
        toolId: '{{BTC_PRICE_TOOL_ID}}'
      }
    },
    {
      id: 'fetch-news',
      type: 'parallel_branch',
      label: '获取新闻',
      position: { x: 500, y: 300 },
      data: {
        parallelId: 'data-fetch',
        branchName: 'news',
        toolId: '{{NEWS_TOOL_ID}}',
        keywords: ['AI', '区块链', '科技']
      }
    },
    {
      id: 'parallel-end',
      type: 'parallel_end',
      label: '汇总数据',
      position: { x: 700, y: 200 },
      data: {
        parallelId: 'data-fetch',
        aggregationScript: `
          // 汇总所有并发获取的数据
          const weatherData = results.weather?.toolResult || {};
          const btcData = results.btcPrice?.toolResult || {};
          const newsData = results.news?.toolResult || {};
          
          return {
            aggregatedData: {
              weather: {
                temperature: weatherData.temperature,
                condition: weatherData.condition,
                location: weatherData.location
              },
              crypto: {
                btcPrice: btcData.price,
                change24h: btcData.change24h
              },
              news: {
                headlines: newsData.articles?.slice(0, 3) || [],
                totalCount: newsData.totalCount || 0
              },
              timestamp: new Date().toISOString(),
              dataQuality: {
                weatherAvailable: !!weatherData.temperature,
                btcAvailable: !!btcData.price,
                newsAvailable: !!newsData.articles?.length
              }
            }
          };
        `
      }
    },
    {
      id: 'analyze-data',
      type: 'agent',
      label: '分析汇总数据',
      position: { x: 900, y: 200 },
      data: {
        agentId: '{{ANALYSIS_AGENT_ID}}',
        message: `
          请分析以下数据并提供洞察：
          
          天气信息：{{aggregatedData.weather.location}} {{aggregatedData.weather.temperature}}°C，{{aggregatedData.weather.condition}}
          BTC价格：${{aggregatedData.crypto.btcPrice}}，24小时变化：{{aggregatedData.crypto.change24h}}%
          新闻摘要：{{aggregatedData.news.headlines}}
          
          请提供：
          1. 数据质量评估
          2. 关键趋势分析
          3. 投资建议（如果适用）
          4. 风险提示
        `
      }
    },
    {
      id: 'generate-report',
      type: 'script',
      label: '生成最终报告',
      position: { x: 1100, y: 200 },
      data: {
        script: `
          const analysis = context.agentResponse || '';
          const data = context.aggregatedData || {};
          
          const report = {
            reportId: 'RPT-' + Date.now(),
            timestamp: new Date().toISOString(),
            dataSnapshot: data,
            analysis: analysis,
            summary: {
              dataSourcesUsed: Object.keys(data).length,
              weatherLocation: data.weather?.location,
              btcPrice: data.crypto?.btcPrice,
              newsCount: data.news?.totalCount,
              dataQuality: data.dataQuality
            },
            recommendations: analysis.includes('建议') ? '包含投资建议' : '无特定建议'
          };
          
          console.log('生成综合分析报告:', report.reportId);
          
          return { finalReport: report };
        `
      }
    },
    {
      id: 'end',
      type: 'end',
      label: '结束',
      position: { x: 1300, y: 200 },
      data: {}
    }
  ] as WorkflowNode[],
  
  edges: [
    {
      id: 'start-to-parallel',
      source: 'start',
      target: 'parallel-start',
      label: '开始并发'
    },
    {
      id: 'parallel-to-weather',
      source: 'parallel-start',
      target: 'fetch-weather',
      label: '获取天气'
    },
    {
      id: 'parallel-to-btc',
      source: 'parallel-start',
      target: 'fetch-btc-price',
      label: '获取价格'
    },
    {
      id: 'parallel-to-news',
      source: 'parallel-start',
      target: 'fetch-news',
      label: '获取新闻'
    },
    {
      id: 'weather-to-end',
      source: 'fetch-weather',
      target: 'parallel-end',
      label: '完成'
    },
    {
      id: 'btc-to-end',
      source: 'fetch-btc-price',
      target: 'parallel-end',
      label: '完成'
    },
    {
      id: 'news-to-end',
      source: 'fetch-news',
      target: 'parallel-end',
      label: '完成'
    },
    {
      id: 'end-to-analyze',
      source: 'parallel-end',
      target: 'analyze-data',
      label: '分析数据'
    },
    {
      id: 'analyze-to-report',
      source: 'analyze-data',
      target: 'generate-report',
      label: '生成报告'
    },
    {
      id: 'report-to-end',
      source: 'generate-report',
      target: 'end',
      label: '完成'
    }
  ] as WorkflowEdge[],
  
  variables: {
    location: 'Beijing',
    analysisDepth: 'detailed'
  },
  
  triggers: [
    {
      type: 'manual',
      config: {}
    },
    {
      type: 'schedule',
      config: {
        cron: '0 9 * * *' // 每天上午9点自动执行
      }
    }
  ]
};

// 快速响应并发工作流示例
export const fastResponseParallelWorkflowTemplate = {
  name: '快速响应并发工作流',
  description: '使用wait_first策略，获取最快响应的数据源',
  isTemplate: true,
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: '开始',
      position: { x: 100, y: 200 },
      data: {}
    },
    {
      id: 'parallel-start',
      type: 'parallel_start',
      label: '并发查询',
      position: { x: 300, y: 200 },
      data: {
        parallelId: 'fast-query',
        parallelStrategy: 'wait_first',
        parallelTimeout: 10000,
        failureStrategy: 'continue_on_error'
      }
    },
    {
      id: 'query-api1',
      type: 'parallel_branch',
      label: 'API源1',
      position: { x: 500, y: 150 },
      data: {
        parallelId: 'fast-query',
        branchName: 'api1',
        toolId: '{{API1_TOOL_ID}}',
        query: '{{searchQuery}}'
      }
    },
    {
      id: 'query-api2',
      type: 'parallel_branch',
      label: 'API源2',
      position: { x: 500, y: 250 },
      data: {
        parallelId: 'fast-query',
        branchName: 'api2',
        toolId: '{{API2_TOOL_ID}}',
        query: '{{searchQuery}}'
      }
    },
    {
      id: 'parallel-end',
      type: 'parallel_end',
      label: '获取最快结果',
      position: { x: 700, y: 200 },
      data: {
        parallelId: 'fast-query',
        aggregationScript: `
          // 返回第一个成功的结果
          const availableResults = Object.values(results).filter(r => r && !r.error);
          if (availableResults.length > 0) {
            return {
              fastestResult: availableResults[0],
              responseTime: Date.now() - context.startTime,
              source: Object.keys(results).find(key => results[key] === availableResults[0])
            };
          }
          return { error: 'No successful responses' };
        `
      }
    },
    {
      id: 'process-result',
      type: 'script',
      label: '处理结果',
      position: { x: 900, y: 200 },
      data: {
        script: `
          const result = context.fastestResult || {};
          const source = context.source || 'unknown';
          const responseTime = context.responseTime || 0;
          
          return {
            processedData: result,
            metadata: {
              source: source,
              responseTime: responseTime + 'ms',
              timestamp: new Date().toISOString()
            }
          };
        `
      }
    },
    {
      id: 'end',
      type: 'end',
      label: '结束',
      position: { x: 1100, y: 200 },
      data: {}
    }
  ] as WorkflowNode[],
  
  edges: [
    {
      id: 'start-to-parallel',
      source: 'start',
      target: 'parallel-start'
    },
    {
      id: 'parallel-to-api1',
      source: 'parallel-start',
      target: 'query-api1'
    },
    {
      id: 'parallel-to-api2',
      source: 'parallel-start',
      target: 'query-api2'
    },
    {
      id: 'api1-to-end',
      source: 'query-api1',
      target: 'parallel-end'
    },
    {
      id: 'api2-to-end',
      source: 'query-api2',
      target: 'parallel-end'
    },
    {
      id: 'end-to-process',
      source: 'parallel-end',
      target: 'process-result'
    },
    {
      id: 'process-to-end',
      source: 'process-result',
      target: 'end'
    }
  ] as WorkflowEdge[],
  
  variables: {
    searchQuery: 'AI技术趋势',
    timeout: 10000
  },
  
  triggers: [{ type: 'manual', config: {} }]
}; 