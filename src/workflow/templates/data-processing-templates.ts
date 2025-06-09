import { Workflow, WorkflowNode, WorkflowEdge } from '../entities/workflow.entity';

/**
 * 文档处理工作流模板
 */
export const documentProcessingTemplate: Partial<Workflow> = {
  name: '文档智能处理流程',
  description: '对文档进行提取、向量化、总结和分析的完整处理流程',
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
      id: 'extract',
      type: 'extract_data',
      label: '内容提取',
      position: { x: 300, y: 100 },
      data: {
        extractors: ['text', 'image', 'table'],
        extractFormat: 'structured',
        outputFormat: 'json'
      }
    },
    {
      id: 'condition',
      type: 'condition',
      label: '质量检查',
      position: { x: 500, y: 100 },
      data: {
        condition: 'extractionMetadata.quality > 0.8'
      }
    },
    {
      id: 'vectorize',
      type: 'vectorize_data',
      label: '向量化',
      position: { x: 700, y: 50 },
      data: {
        vectorModel: 'text-embedding-ada-002',
        dimensions: 1536,
        chunkSize: 500,
        overlap: 50,
        indexName: 'document-index'
      }
    },
    {
      id: 'summarize',
      type: 'summarize_data',
      label: '智能总结',
      position: { x: 700, y: 150 },
      data: {
        summaryModel: 'gpt-4',
        maxLength: 300,
        summaryStyle: 'brief',
        language: 'zh-CN'
      }
    },
    {
      id: 'analyze',
      type: 'analyze_data',
      label: '情感分析',
      position: { x: 900, y: 100 },
      data: {
        analysisType: 'sentiment',
        analysisModel: 'sentiment-analyzer',
        analysisConfig: {
          detailedAnalysis: true,
          includeEntities: true
        }
      }
    },
    {
      id: 'end_success',
      type: 'end',
      label: '处理完成',
      position: { x: 1100, y: 100 },
      data: {}
    },
    {
      id: 'end_failed',
      type: 'end',
      label: '质量不达标',
      position: { x: 500, y: 200 },
      data: {}
    }
  ],
  edges: [
    {
      id: 'start-extract',
      source: 'start',
      target: 'extract',
      label: '开始提取'
    },
    {
      id: 'extract-condition',
      source: 'extract',
      target: 'condition',
      label: '检查质量'
    },
    {
      id: 'condition-vectorize',
      source: 'condition',
      target: 'vectorize',
      label: '质量合格',
      condition: 'true'
    },
    {
      id: 'condition-summarize',
      source: 'condition',
      target: 'summarize',
      label: '质量合格',
      condition: 'true'
    },
    {
      id: 'condition-failed',
      source: 'condition',
      target: 'end_failed',
      label: '质量不达标',
      condition: 'false'
    },
    {
      id: 'vectorize-analyze',
      source: 'vectorize',
      target: 'analyze',
      label: '向量化完成'
    },
    {
      id: 'summarize-analyze',
      source: 'summarize',
      target: 'analyze',
      label: '总结完成'
    },
    {
      id: 'analyze-end',
      source: 'analyze',
      target: 'end_success',
      label: '分析完成'
    }
  ]
};

/**
 * 数据清洗和转换工作流模板
 */
export const dataCleaningTemplate: Partial<Workflow> = {
  name: '数据清洗转换流程',
  description: '对原始数据进行清洗、格式化和转换',
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
      id: 'extract',
      type: 'extract_data',
      label: '数据提取',
      position: { x: 300, y: 100 },
      data: {
        extractors: ['text'],
        extractFormat: 'text',
        outputFormat: 'text'
      }
    },
    {
      id: 'clean',
      type: 'transform_data',
      label: '数据清洗',
      position: { x: 500, y: 100 },
      data: {
        transformType: 'clean',
        transformConfig: {
          removeEmptyLines: true,
          trimWhitespace: true,
          normalizeEncoding: true
        },
        targetFormat: 'cleaned_text'
      }
    },
    {
      id: 'format',
      type: 'transform_data',
      label: '格式转换',
      position: { x: 700, y: 100 },
      data: {
        transformType: 'format',
        transformConfig: {
          outputFormat: 'json',
          includeMetadata: true
        },
        targetFormat: 'json'
      }
    },
    {
      id: 'end',
      type: 'end',
      label: '完成',
      position: { x: 900, y: 100 },
      data: {}
    }
  ],
  edges: [
    {
      id: 'start-extract',
      source: 'start',
      target: 'extract'
    },
    {
      id: 'extract-clean',
      source: 'extract',
      target: 'clean'
    },
    {
      id: 'clean-format',
      source: 'clean',
      target: 'format'
    },
    {
      id: 'format-end',
      source: 'format',
      target: 'end'
    }
  ]
};

/**
 * 快速文档分析工作流模板
 */
export const quickAnalysisTemplate: Partial<Workflow> = {
  name: '快速文档分析',
  description: '对文档进行快速提取和分析，适用于简单场景',
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
      id: 'extract',
      type: 'extract_data',
      label: '提取内容',
      position: { x: 300, y: 100 },
      data: {
        extractors: ['text'],
        extractFormat: 'text',
        outputFormat: 'text'
      }
    },
    {
      id: 'parallel_start',
      type: 'parallel_start',
      label: '并发处理',
      position: { x: 500, y: 100 },
      data: {
        parallelId: 'analysis_parallel',
        parallelStrategy: 'wait_all',
        parallelTimeout: 30000
      }
    },
    {
      id: 'summarize_branch',
      type: 'parallel_branch',
      label: '总结分支',
      position: { x: 700, y: 50 },
      data: {
        parallelId: 'analysis_parallel',
        branchName: 'summarization'
      }
    },
    {
      id: 'summarize',
      type: 'summarize_data',
      label: '生成总结',
      position: { x: 850, y: 50 },
      data: {
        summaryModel: 'gpt-3.5-turbo',
        maxLength: 200,
        summaryStyle: 'brief',
        language: 'zh-CN'
      }
    },
    {
      id: 'analyze_branch',
      type: 'parallel_branch',
      label: '分析分支',
      position: { x: 700, y: 150 },
      data: {
        parallelId: 'analysis_parallel',
        branchName: 'analysis'
      }
    },
    {
      id: 'analyze',
      type: 'analyze_data',
      label: '主题分析',
      position: { x: 850, y: 150 },
      data: {
        analysisType: 'topic',
        analysisModel: 'topic-analyzer',
        analysisConfig: {
          maxTopics: 5,
          minConfidence: 0.7
        }
      }
    },
    {
      id: 'parallel_end',
      type: 'parallel_end',
      label: '汇总结果',
      position: { x: 1000, y: 100 },
      data: {
        parallelId: 'analysis_parallel',
        aggregationScript: `
          return {
            summary: branches.summarization.result,
            topics: branches.analysis.result,
            processedAt: new Date()
          };
        `
      }
    },
    {
      id: 'end',
      type: 'end',
      label: '完成',
      position: { x: 1200, y: 100 },
      data: {}
    }
  ],
  edges: [
    {
      id: 'start-extract',
      source: 'start',
      target: 'extract'
    },
    {
      id: 'extract-parallel',
      source: 'extract',
      target: 'parallel_start'
    },
    {
      id: 'parallel-summarize_branch',
      source: 'parallel_start',
      target: 'summarize_branch'
    },
    {
      id: 'summarize_branch-summarize',
      source: 'summarize_branch',
      target: 'summarize'
    },
    {
      id: 'parallel-analyze_branch',
      source: 'parallel_start',
      target: 'analyze_branch'
    },
    {
      id: 'analyze_branch-analyze',
      source: 'analyze_branch',
      target: 'analyze'
    },
    {
      id: 'summarize-parallel_end',
      source: 'summarize',
      target: 'parallel_end'
    },
    {
      id: 'analyze-parallel_end',
      source: 'analyze',
      target: 'parallel_end'
    },
    {
      id: 'parallel_end-end',
      source: 'parallel_end',
      target: 'end'
    }
  ]
};

/**
 * 获取所有数据处理模板
 */
export const dataProcessingTemplates = [
  documentProcessingTemplate,
  dataCleaningTemplate,
  quickAnalysisTemplate
]; 