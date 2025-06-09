import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../user/user.entity';
import { WorkflowExecution } from './workflow-execution.entity';

export enum WorkflowStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

// Intent recognition related interfaces
export interface IntentCategory {
  id: string;
  name: string;
  description: string;
  keywords?: string[];
  examples?: string[];
  targetNodeType?: string;
  targetNodeId?: string;
  requiredParameters?: IntentParameter[];
  confidence?: number;
  priority?: number;
  enabled?: boolean;
}

export interface IntentParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  description: string;
  required: boolean;
  defaultValue?: any;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    options?: any[];
  };
  extractionPrompt?: string;
}

export interface IntentValidationRule {
  field: string;
  rule: 'required' | 'pattern' | 'range' | 'custom';
  value?: any;
  message?: string;
  customValidator?: string;
}

@Entity('workflow')
export class Workflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'text',
    default: WorkflowStatus.DRAFT,
  })
  status: WorkflowStatus;

  @Column({ type: 'json' })
  nodes: WorkflowNode[];

  @Column({ type: 'json' })
  edges: WorkflowEdge[];

  @Column({ type: 'json', nullable: true })
  variables?: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  triggers?: WorkflowTrigger[];

  @Column({ type: 'boolean', default: false })
  isTemplate: boolean;

  @ManyToOne(() => User)
  user: User;

  @OneToMany(() => WorkflowExecution, (execution) => execution.workflow)
  executions: WorkflowExecution[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export interface WorkflowNode {
  id: string;
  type:
    | 'start'
    | 'end'
    | 'tool'
    | 'agent'
    | 'condition'
    | 'user_input'
    | 'wait_event'
    | 'approval'
    | 'script'
    | 'delay'
    | 'loop_start'
    | 'loop_end'
    | 'loop_condition'
    | 'parallel_start'
    | 'parallel_end'
    | 'parallel_branch'
    | 'mcp_tool'
    | 'llm'
    | 'intent_recognition'
    | 'extract_data'
    | 'vectorize_data'
    | 'summarize_data'
    | 'analyze_data'
    | 'transform_data';
  label: string;
  position: { x: number; y: number };
  data: {
    toolId?: string;
    agentId?: string;
    condition?: string;
    script?: string;
    prompt?: string;
    timeout?: number;
    eventType?: string;
    eventCondition?: any;
    approvers?: string[];
    delayMs?: number;
    loopId?: string;
    maxIterations?: number;
    loopCondition?: string;
    exitCondition?: string;
    exitEventType?: string;
    exitEventCondition?: any;
    exitKeyword?: string;
    parallelId?: string;
    parallelTimeout?: number;
    parallelStrategy?: 'wait_all' | 'wait_any' | 'wait_first';
    branchName?: string;
    aggregationScript?: string;
    failureStrategy?: 'fail_fast' | 'continue_on_error' | 'ignore_errors';
    mcpServerId?: string;
    mcpServerName?: string;
    mcpToolName?: string;
    mcpToolId?: string;
    mcpArguments?: Record<string, any>;
    mcpTimeout?: number;
    mcpRetryAttempts?: number;
    mcpRetryDelay?: number;
    // LLM node specific fields
    modelName?: string;
    modelId?: string;
    systemPrompt?: string;
    messages?: any[];
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stream?: boolean;
    enableConversation?: boolean;
    conversationId?: string;
    conversationMaxHistory?: number;
    retryAttempts?: number;
    retryDelay?: number;
    outputFormat?: 'text' | 'json' | 'markdown';
    extractFields?: string[];
    transformScript?: string;
    // Intent recognition node specific fields
    intentModelName?: string;
    intentModelId?: string;
    intentSystemPrompt?: string;
    intentCategories?: IntentCategory[];
    intentConfidenceThreshold?: number;
    intentFallbackAction?:
      | 'ask_clarification'
      | 'default_intent'
      | 'human_handoff';
    intentParameterExtraction?: boolean;
    intentParameterSchema?: Record<string, any>;
    intentContextWindow?: number;
    intentEnableHistory?: boolean;
    intentHistoryMaxLength?: number;
    intentCustomPrompt?: string;
    intentOutputFormat?: 'structured' | 'simple';
    intentEnableMultiIntent?: boolean;
    intentValidationRules?: IntentValidationRule[];
    // Enhanced condition node fields
    conditionType?: 'simple' | 'smart_router' | 'value_matcher';
    defaultTargetNodeId?: string;
    routingRules?: ConditionRoutingRule[];
    valueMatchingConfig?: ValueMatchingConfig;
    routingStrategy?: 'first_match' | 'best_match' | 'weighted_score';
    enableFallback?: boolean;
    fallbackNodeId?: string;
    debugMode?: boolean;
    
    // Data processing nodes
    // Extract data node
    extractors?: string[];
    extractFormat?: 'text' | 'markdown' | 'json' | 'structured';
    sourceFileId?: string;
    sourceFilePath?: string;
    dataOutputFormat?: 'text' | 'json' | 'markdown';
    
    // Vectorize data node
    vectorModel?: string;
    dimensions?: number;
    chunkSize?: number;
    overlap?: number;
    indexName?: string;
    
    // Summarize data node
    summaryModel?: string;
    maxLength?: number;
    summaryStyle?: 'brief' | 'detailed' | 'technical' | 'creative';
    language?: string;
    
    // Analyze data node
    analysisType?: 'sentiment' | 'topic' | 'entity' | 'relation' | 'classification';
    analysisModel?: string;
    analysisConfig?: Record<string, any>;
    
    // Transform data node
    transformType?: 'format' | 'clean' | 'split' | 'merge' | 'filter';
    transformConfig?: Record<string, any>;
    targetFormat?: string;
    
    [key: string]: any;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
  data?: any;
}

export interface WorkflowTrigger {
  type: 'manual' | 'schedule' | 'webhook' | 'event';
  config: {
    cron?: string;
    webhook?: string;
    eventType?: string;
    eventCondition?: any;
  };
}

// 条件路由规则接口
export interface ConditionRoutingRule {
  id: string;
  name: string;
  description?: string;
  targetNodeId: string;
  condition: string;
  priority?: number;
  weight?: number;
  enabled?: boolean;
  matchType?: 'exact' | 'contains' | 'regex' | 'range' | 'custom';
  expectedValue?: any;
  tolerance?: number;
  customMatcher?: string;
}

// 值匹配配置接口
export interface ValueMatchingConfig {
  sourceField: string;
  matchingRules: ValueMatchingRule[];
  defaultNodeId?: string;
  enableFuzzyMatch?: boolean;
  fuzzyThreshold?: number;
  caseSensitive?: boolean;
}

// 值匹配规则接口
export interface ValueMatchingRule {
  id: string;
  name: string;
  targetNodeId: string;
  matchValues: any[];
  matchType:
    | 'exact'
    | 'contains'
    | 'startsWith'
    | 'endsWith'
    | 'regex'
    | 'range';
  priority: number;
  enabled: boolean;
  pattern?: string;
  rangeMin?: number;
  rangeMax?: number;
}
