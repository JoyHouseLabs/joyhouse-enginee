import {
  Workflow,
  WorkflowStatus,
  IntentCategory,
  IntentParameter,
} from '../entities/workflow.entity';

// 定义意图类别
const intentCategories: IntentCategory[] = [
  {
    id: 'weather_query',
    name: '天气查询',
    description: '查询天气信息',
    keywords: ['天气', '气温', '下雨', '晴天', '阴天', '温度'],
    examples: ['明天天气怎么样', '北京今天下雨吗', '上海的气温是多少'],
    targetNodeType: 'tool',
    targetNodeId: 'weather_tool',
    requiredParameters: [
      {
        name: 'location',
        type: 'string',
        description: '查询天气的地点',
        required: true,
        extractionPrompt: '从用户输入中提取地点信息',
      },
      {
        name: 'date',
        type: 'string',
        description: '查询的日期（今天、明天、后天等）',
        required: false,
        defaultValue: '今天',
      },
    ],
    priority: 1,
    enabled: true,
  },
  {
    id: 'image_generation',
    name: '图像生成',
    description: '生成或创作图像',
    keywords: ['画', '图片', '图像', '生成', '创作', '绘制'],
    examples: ['给我画一幅画', '生成一张风景图', '创作一个卡通形象'],
    targetNodeType: 'agent',
    targetNodeId: 'image_agent',
    requiredParameters: [
      {
        name: 'description',
        type: 'string',
        description: '图像描述',
        required: true,
        extractionPrompt: '提取用户想要生成的图像描述',
      },
      {
        name: 'style',
        type: 'string',
        description: '图像风格',
        required: false,
        validation: {
          options: ['写实', '卡通', '抽象', '油画', '水彩'],
        },
      },
      {
        name: 'size',
        type: 'string',
        description: '图像尺寸',
        required: false,
        defaultValue: '1024x1024',
        validation: {
          options: ['512x512', '1024x1024', '1024x1792'],
        },
      },
    ],
    priority: 2,
    enabled: true,
  },
  {
    id: 'data_collection',
    name: '数据收集',
    description: '收集用户输入的多个参数',
    keywords: ['输入', '填写', '提供', '告诉我', '需要'],
    examples: ['我需要输入一些信息', '请让我填写表单', '收集用户数据'],
    targetNodeType: 'loop_start',
    targetNodeId: 'data_collection_loop',
    requiredParameters: [
      {
        name: 'fields',
        type: 'array',
        description: '需要收集的字段列表',
        required: true,
        extractionPrompt: '提取用户想要输入或收集的信息字段',
      },
      {
        name: 'maxAttempts',
        type: 'number',
        description: '最大尝试次数',
        required: false,
        defaultValue: 3,
        validation: {
          min: 1,
          max: 10,
        },
      },
    ],
    priority: 3,
    enabled: true,
  },
  {
    id: 'email_send',
    name: '发送邮件',
    description: '发送电子邮件',
    keywords: ['邮件', '发送', 'email', '通知', '消息'],
    examples: ['发送一封邮件', '给张三发邮件', '通知团队成员'],
    targetNodeType: 'tool',
    targetNodeId: 'email_tool',
    requiredParameters: [
      {
        name: 'recipient',
        type: 'string',
        description: '收件人邮箱地址',
        required: true,
        validation: {
          pattern: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$',
        },
      },
      {
        name: 'subject',
        type: 'string',
        description: '邮件主题',
        required: true,
      },
      {
        name: 'content',
        type: 'string',
        description: '邮件内容',
        required: true,
      },
    ],
    priority: 2,
    enabled: true,
  },
  {
    id: 'help_request',
    name: '帮助请求',
    description: '用户请求帮助或说明',
    keywords: ['帮助', '怎么', '如何', '说明', '教程'],
    examples: ['怎么使用这个功能', '请帮助我', '如何操作'],
    targetNodeType: 'llm',
    targetNodeId: 'help_llm',
    requiredParameters: [
      {
        name: 'topic',
        type: 'string',
        description: '需要帮助的主题',
        required: false,
        extractionPrompt: '提取用户需要帮助的具体主题或功能',
      },
    ],
    priority: 4,
    enabled: true,
  },
];

export const intentRecognitionWorkflowExample: Partial<Workflow> = {
  name: '智能意图识别工作流',
  description:
    '展示意图识别节点的完整功能，包括多种意图类别、参数提取和智能路由',
  status: WorkflowStatus.PUBLISHED,
  isTemplate: true,
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: '开始',
      position: { x: 100, y: 300 },
      data: {},
    },
    {
      id: 'intent_recognition',
      type: 'intent_recognition',
      label: '意图识别',
      position: { x: 300, y: 300 },
      data: {
        intentModelName: 'gpt-4',
        intentSystemPrompt:
          '你是一个专业的意图识别助手，能够准确理解用户的需求并识别相应的意图。',
        intentCategories,
        intentConfidenceThreshold: 0.7,
        intentFallbackAction: 'ask_clarification',
        intentParameterExtraction: true,
        intentEnableHistory: true,
        intentHistoryMaxLength: 5,
        intentOutputFormat: 'structured',
        intentEnableMultiIntent: false,
        timeout: 30000,
        retryAttempts: 3,
      },
    },
    {
      id: 'intent_router',
      type: 'condition',
      label: '意图路由',
      position: { x: 500, y: 300 },
      data: {
        condition:
          '{{intent_recognition.needsClarification}} === false && {{intent_recognition.confidence}} >= 0.7',
      },
    },
    // 天气查询分支
    {
      id: 'weather_check',
      type: 'condition',
      label: '天气查询检查',
      position: { x: 700, y: 100 },
      data: {
        condition:
          '{{intent_recognition.primaryIntent.intentId}} === "weather_query"',
      },
    },
    {
      id: 'weather_params_check',
      type: 'condition',
      label: '天气参数检查',
      position: { x: 900, y: 100 },
      data: {
        condition: '{{intent_recognition.parameterExtractionNeeded}} === false',
      },
    },
    {
      id: 'weather_tool',
      type: 'tool',
      label: '天气工具',
      position: { x: 1100, y: 50 },
      data: {
        toolId: 'weather_api',
        location: '{{intent_recognition.extractedParameters.location}}',
        date: '{{intent_recognition.extractedParameters.date}}',
      },
    },
    {
      id: 'weather_param_request',
      type: 'user_input',
      label: '请求天气参数',
      position: { x: 1100, y: 150 },
      data: {
        prompt:
          '请提供查询天气的地点：{{intent_recognition.extractedParameters.location || "未指定"}}',
      },
    },
    // 图像生成分支
    {
      id: 'image_check',
      type: 'condition',
      label: '图像生成检查',
      position: { x: 700, y: 200 },
      data: {
        condition:
          '{{intent_recognition.primaryIntent.intentId}} === "image_generation"',
      },
    },
    {
      id: 'image_params_check',
      type: 'condition',
      label: '图像参数检查',
      position: { x: 900, y: 200 },
      data: {
        condition: '{{intent_recognition.parameterExtractionNeeded}} === false',
      },
    },
    {
      id: 'image_agent',
      type: 'agent',
      label: '图像生成代理',
      position: { x: 1100, y: 200 },
      data: {
        agentId: 'image_generation_agent',
        message:
          '生成图像：{{intent_recognition.extractedParameters.description}}，风格：{{intent_recognition.extractedParameters.style || "默认"}}，尺寸：{{intent_recognition.extractedParameters.size || "1024x1024"}}',
      },
    },
    // 数据收集分支
    {
      id: 'data_collection_check',
      type: 'condition',
      label: '数据收集检查',
      position: { x: 700, y: 300 },
      data: {
        condition:
          '{{intent_recognition.primaryIntent.intentId}} === "data_collection"',
      },
    },
    {
      id: 'data_collection_loop',
      type: 'loop_start',
      label: '数据收集循环',
      position: { x: 900, y: 300 },
      data: {
        loopId: 'data_collection',
        maxIterations: 3,
        exitKeyword: '完成',
      },
    },
    {
      id: 'data_input_request',
      type: 'user_input',
      label: '请求数据输入',
      position: { x: 1100, y: 300 },
      data: {
        prompt:
          '请输入：{{intent_recognition.extractedParameters.fields[currentIteration-1] || "下一个字段"}}',
      },
    },
    {
      id: 'data_collection_end',
      type: 'loop_end',
      label: '数据收集结束',
      position: { x: 1300, y: 300 },
      data: {
        loopId: 'data_collection',
      },
    },
    // 邮件发送分支
    {
      id: 'email_check',
      type: 'condition',
      label: '邮件发送检查',
      position: { x: 700, y: 400 },
      data: {
        condition:
          '{{intent_recognition.primaryIntent.intentId}} === "email_send"',
      },
    },
    {
      id: 'email_tool',
      type: 'tool',
      label: '邮件工具',
      position: { x: 900, y: 400 },
      data: {
        toolId: 'email_sender',
        recipient: '{{intent_recognition.extractedParameters.recipient}}',
        subject: '{{intent_recognition.extractedParameters.subject}}',
        content: '{{intent_recognition.extractedParameters.content}}',
      },
    },
    // 帮助请求分支
    {
      id: 'help_check',
      type: 'condition',
      label: '帮助请求检查',
      position: { x: 700, y: 500 },
      data: {
        condition:
          '{{intent_recognition.primaryIntent.intentId}} === "help_request"',
      },
    },
    {
      id: 'help_llm',
      type: 'llm',
      label: '帮助LLM',
      position: { x: 900, y: 500 },
      data: {
        modelName: 'gpt-3.5-turbo',
        systemPrompt: '你是一个友好的助手，专门为用户提供帮助和指导。',
        prompt:
          '用户需要关于"{{intent_recognition.extractedParameters.topic || "一般使用"}}"的帮助，请提供详细的说明和指导。',
        temperature: 0.7,
        maxTokens: 500,
      },
    },
    // 澄清分支
    {
      id: 'clarification_request',
      type: 'llm',
      label: '澄清请求',
      position: { x: 700, y: 600 },
      data: {
        modelName: 'gpt-3.5-turbo',
        systemPrompt: '你是一个友好的助手，帮助用户澄清他们的意图。',
        prompt: `用户输入："{{intent_recognition.userInput}}"

识别结果：{{intent_recognition.fallbackAction.message}}

建议的操作类型：
{{#each intent_recognition.fallbackAction.suggestions}}
- {{this}}
{{/each}}

请友好地询问用户想要执行什么操作，并提供具体的选项。`,
        temperature: 0.7,
        maxTokens: 300,
      },
    },
    // 结果汇总
    {
      id: 'result_summary',
      type: 'llm',
      label: '结果汇总',
      position: { x: 1500, y: 300 },
      data: {
        modelName: 'gpt-3.5-turbo',
        systemPrompt:
          '你是一个结果汇总专家，能够将执行结果整理成用户友好的格式。',
        prompt: `任务执行完成！

识别的意图：{{intent_recognition.primaryIntent.intentName}}
置信度：{{intent_recognition.confidence}}
提取的参数：{{intent_recognition.extractedParameters}}

执行结果：
- 天气查询：{{weather_tool.toolResult}}
- 图像生成：{{image_agent.agentResponse}}
- 数据收集：{{data_collection_end.loopExited}}
- 邮件发送：{{email_tool.toolResult}}
- 帮助信息：{{help_llm.llmResponse}}

请生成一个友好的总结报告。`,
        temperature: 0.5,
        maxTokens: 400,
      },
    },
    {
      id: 'end',
      type: 'end',
      label: '结束',
      position: { x: 1700, y: 300 },
      data: {},
    },
  ],
  edges: [
    // 主流程
    { id: 'e1', source: 'start', target: 'intent_recognition' },
    { id: 'e2', source: 'intent_recognition', target: 'intent_router' },

    // 成功识别分支
    {
      id: 'e3',
      source: 'intent_router',
      target: 'weather_check',
      condition: 'true',
    },
    {
      id: 'e4',
      source: 'intent_router',
      target: 'image_check',
      condition: 'true',
    },
    {
      id: 'e5',
      source: 'intent_router',
      target: 'data_collection_check',
      condition: 'true',
    },
    {
      id: 'e6',
      source: 'intent_router',
      target: 'email_check',
      condition: 'true',
    },
    {
      id: 'e7',
      source: 'intent_router',
      target: 'help_check',
      condition: 'true',
    },

    // 澄清分支
    {
      id: 'e8',
      source: 'intent_router',
      target: 'clarification_request',
      condition: 'false',
    },

    // 天气查询流程
    {
      id: 'e9',
      source: 'weather_check',
      target: 'weather_params_check',
      condition: 'true',
    },
    {
      id: 'e10',
      source: 'weather_params_check',
      target: 'weather_tool',
      condition: 'true',
    },
    {
      id: 'e11',
      source: 'weather_params_check',
      target: 'weather_param_request',
      condition: 'false',
    },
    { id: 'e12', source: 'weather_param_request', target: 'weather_tool' },
    { id: 'e13', source: 'weather_tool', target: 'result_summary' },

    // 图像生成流程
    {
      id: 'e14',
      source: 'image_check',
      target: 'image_params_check',
      condition: 'true',
    },
    {
      id: 'e15',
      source: 'image_params_check',
      target: 'image_agent',
      condition: 'true',
    },
    { id: 'e16', source: 'image_agent', target: 'result_summary' },

    // 数据收集流程
    {
      id: 'e17',
      source: 'data_collection_check',
      target: 'data_collection_loop',
      condition: 'true',
    },
    { id: 'e18', source: 'data_collection_loop', target: 'data_input_request' },
    { id: 'e19', source: 'data_input_request', target: 'data_collection_end' },
    { id: 'e20', source: 'data_collection_end', target: 'result_summary' },

    // 邮件发送流程
    {
      id: 'e21',
      source: 'email_check',
      target: 'email_tool',
      condition: 'true',
    },
    { id: 'e22', source: 'email_tool', target: 'result_summary' },

    // 帮助请求流程
    { id: 'e23', source: 'help_check', target: 'help_llm', condition: 'true' },
    { id: 'e24', source: 'help_llm', target: 'result_summary' },

    // 澄清流程
    { id: 'e25', source: 'clarification_request', target: 'result_summary' },

    // 结束
    { id: 'e26', source: 'result_summary', target: 'end' },
  ],
  variables: {
    userInput: {
      type: 'string',
      description: '用户输入的文本',
      required: true,
      default: '明天北京的天气怎么样？',
    },
    debugMode: {
      type: 'boolean',
      description: '是否启用调试模式',
      required: false,
      default: false,
    },
  },
};

// 简化的意图识别示例
export const simpleIntentWorkflowExample: Partial<Workflow> = {
  name: '简单意图识别示例',
  description: '展示基础的意图识别和路由功能',
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
      id: 'simple_intent',
      type: 'intent_recognition',
      label: '简单意图识别',
      position: { x: 300, y: 200 },
      data: {
        intentModelName: 'gpt-3.5-turbo',
        intentCategories: [
          {
            id: 'greeting',
            name: '问候',
            description: '用户的问候语',
            keywords: ['你好', '早上好', '晚上好', 'hello'],
            examples: ['你好', '早上好', 'Hello'],
            targetNodeType: 'llm',
            targetNodeId: 'greeting_response',
            requiredParameters: [],
            confidence: 0.8,
            priority: 1,
            enabled: true,
          },
          {
            id: 'question',
            name: '提问',
            description: '用户的问题',
            keywords: ['什么', '怎么', '为什么', '如何'],
            examples: ['这是什么', '怎么使用', '为什么会这样'],
            targetNodeType: 'llm',
            targetNodeId: 'question_response',
            requiredParameters: [
              {
                name: 'topic',
                type: 'string',
                description: '问题主题',
                required: true,
              },
            ],
            confidence: 0.7,
            priority: 2,
            enabled: true,
          },
        ],
        intentConfidenceThreshold: 0.6,
        intentFallbackAction: 'default_intent',
        intentParameterExtraction: false,
        intentOutputFormat: 'simple',
      },
    },
    {
      id: 'greeting_response',
      type: 'llm',
      label: '问候回应',
      position: { x: 500, y: 100 },
      data: {
        modelName: 'gpt-3.5-turbo',
        prompt: '用户向你问候："{{userInput}}"，请友好地回应。',
        temperature: 0.8,
        maxTokens: 100,
      },
    },
    {
      id: 'question_response',
      type: 'llm',
      label: '问题回应',
      position: { x: 500, y: 300 },
      data: {
        modelName: 'gpt-3.5-turbo',
        prompt: '用户问了一个问题："{{userInput}}"，请尽力回答。',
        temperature: 0.7,
        maxTokens: 200,
      },
    },
    {
      id: 'end',
      type: 'end',
      label: '结束',
      position: { x: 700, y: 200 },
      data: {},
    },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'simple_intent' },
    {
      id: 'e2',
      source: 'simple_intent',
      target: 'greeting_response',
      condition: '{{simple_intent.primaryIntent.intentId}} === "greeting"',
    },
    {
      id: 'e3',
      source: 'simple_intent',
      target: 'question_response',
      condition: '{{simple_intent.primaryIntent.intentId}} === "question"',
    },
    { id: 'e4', source: 'greeting_response', target: 'end' },
    { id: 'e5', source: 'question_response', target: 'end' },
  ],
  variables: {
    userInput: {
      type: 'string',
      description: '用户输入',
      required: true,
      default: '你好，今天天气怎么样？',
    },
  },
};

// 增强条件节点示例工作流
export const enhancedConditionWorkflowExample: Partial<Workflow> = {
  id: 'enhanced-condition-workflow',
  name: '增强条件节点工作流',
  description: '演示增强条件节点的智能路由、值匹配和默认节点功能',
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
      id: 'user_input',
      type: 'user_input',
      label: '用户输入',
      position: { x: 250, y: 200 },
      data: {
        prompt: '请输入您的年龄和兴趣爱好：',
        inputFields: [
          { name: 'age', type: 'number', label: '年龄', required: true },
          { name: 'hobby', type: 'text', label: '兴趣爱好', required: true },
        ],
      },
    },
    {
      id: 'smart_router',
      type: 'condition',
      label: '智能路由器',
      position: { x: 400, y: 200 },
      data: {
        conditionType: 'smart_router',
        routingStrategy: 'weighted_score',
        enableFallback: true,
        defaultTargetNodeId: 'default_handler',
        debugMode: true,
        routingRules: [
          {
            id: 'child_rule',
            name: '儿童路由',
            description: '年龄小于18岁的用户',
            targetNodeId: 'child_content',
            condition: '${age} < 18',
            priority: 10,
            weight: 1.0,
            enabled: true,
            matchType: 'exact',
          },
          {
            id: 'adult_rule',
            name: '成人路由',
            description: '年龄18-65岁的用户',
            targetNodeId: 'adult_content',
            condition: '${age} >= 18 && ${age} <= 65',
            priority: 8,
            weight: 1.0,
            enabled: true,
            matchType: 'exact',
          },
          {
            id: 'senior_rule',
            name: '老年人路由',
            description: '年龄大于65岁的用户',
            targetNodeId: 'senior_content',
            condition: '${age} > 65',
            priority: 9,
            weight: 1.0,
            enabled: true,
            matchType: 'exact',
          },
          {
            id: 'sports_lover',
            name: '运动爱好者',
            description: '喜欢运动的用户',
            targetNodeId: 'sports_content',
            condition: '${hobby}',
            expectedValue: '运动',
            priority: 5,
            weight: 0.8,
            enabled: true,
            matchType: 'contains',
          },
        ],
      },
    },
    {
      id: 'hobby_matcher',
      type: 'condition',
      label: '兴趣匹配器',
      position: { x: 600, y: 100 },
      data: {
        conditionType: 'value_matcher',
        enableFallback: true,
        defaultTargetNodeId: 'other_hobby',
        debugMode: true,
        valueMatchingConfig: {
          sourceField: 'hobby',
          enableFuzzyMatch: true,
          fuzzyThreshold: 0.7,
          caseSensitive: false,
          matchingRules: [
            {
              id: 'reading_rule',
              name: '阅读爱好',
              targetNodeId: 'reading_content',
              matchValues: ['读书', '阅读', '看书', 'reading'],
              matchType: 'contains',
              priority: 10,
              enabled: true,
            },
            {
              id: 'music_rule',
              name: '音乐爱好',
              targetNodeId: 'music_content',
              matchValues: ['音乐', '唱歌', '乐器', 'music'],
              matchType: 'contains',
              priority: 9,
              enabled: true,
            },
            {
              id: 'travel_rule',
              name: '旅行爱好',
              targetNodeId: 'travel_content',
              matchValues: ['旅行', '旅游', '出游', 'travel'],
              matchType: 'contains',
              priority: 8,
              enabled: true,
            },
            {
              id: 'tech_rule',
              name: '科技爱好',
              targetNodeId: 'tech_content',
              matchValues: [
                '科技',
                '编程',
                '技术',
                'technology',
                'programming',
              ],
              matchType: 'contains',
              priority: 7,
              enabled: true,
            },
          ],
        },
      },
    },
    // 年龄分组内容节点
    {
      id: 'child_content',
      type: 'llm',
      label: '儿童内容',
      position: { x: 600, y: 50 },
      data: {
        systemPrompt: '为儿童用户提供适合的内容和建议。',
        prompt:
          '根据用户的年龄(${age})和兴趣(${hobby})，提供适合儿童的内容推荐。',
      },
    },
    {
      id: 'adult_content',
      type: 'llm',
      label: '成人内容',
      position: { x: 600, y: 150 },
      data: {
        systemPrompt: '为成年用户提供专业的内容和建议。',
        prompt:
          '根据用户的年龄(${age})和兴趣(${hobby})，提供适合成年人的内容推荐。',
      },
    },
    {
      id: 'senior_content',
      type: 'llm',
      label: '老年人内容',
      position: { x: 600, y: 250 },
      data: {
        systemPrompt: '为老年用户提供贴心的内容和建议。',
        prompt:
          '根据用户的年龄(${age})和兴趣(${hobby})，提供适合老年人的内容推荐。',
      },
    },
    {
      id: 'sports_content',
      type: 'llm',
      label: '运动内容',
      position: { x: 600, y: 350 },
      data: {
        systemPrompt: '为运动爱好者提供专业的运动建议。',
        prompt: '根据用户的运动兴趣，提供个性化的运动建议和计划。',
      },
    },
    // 兴趣分类内容节点
    {
      id: 'reading_content',
      type: 'llm',
      label: '阅读推荐',
      position: { x: 800, y: 50 },
      data: {
        systemPrompt: '为阅读爱好者推荐书籍和阅读计划。',
        prompt: '根据用户的阅读兴趣，推荐适合的书籍和阅读计划。',
      },
    },
    {
      id: 'music_content',
      type: 'llm',
      label: '音乐推荐',
      position: { x: 800, y: 120 },
      data: {
        systemPrompt: '为音乐爱好者推荐音乐和学习资源。',
        prompt: '根据用户的音乐兴趣，推荐音乐作品和学习资源。',
      },
    },
    {
      id: 'travel_content',
      type: 'llm',
      label: '旅行推荐',
      position: { x: 800, y: 190 },
      data: {
        systemPrompt: '为旅行爱好者推荐旅行目的地和攻略。',
        prompt: '根据用户的旅行兴趣，推荐旅行目的地和攻略。',
      },
    },
    {
      id: 'tech_content',
      type: 'llm',
      label: '科技推荐',
      position: { x: 800, y: 260 },
      data: {
        systemPrompt: '为科技爱好者推荐技术资源和学习路径。',
        prompt: '根据用户的科技兴趣，推荐技术资源和学习路径。',
      },
    },
    // 默认和其他处理节点
    {
      id: 'default_handler',
      type: 'llm',
      label: '默认处理',
      position: { x: 600, y: 450 },
      data: {
        systemPrompt: '为用户提供通用的内容和建议。',
        prompt: '根据用户的基本信息，提供通用的内容推荐。',
      },
    },
    {
      id: 'other_hobby',
      type: 'llm',
      label: '其他兴趣',
      position: { x: 800, y: 330 },
      data: {
        systemPrompt: '为有特殊兴趣的用户提供个性化建议。',
        prompt: '根据用户的特殊兴趣(${hobby})，提供个性化的建议和资源。',
      },
    },
    {
      id: 'end',
      type: 'end',
      label: '结束',
      position: { x: 1000, y: 200 },
      data: {},
    },
  ],
  edges: [
    // 主流程
    {
      id: 'start-input',
      source: 'start',
      target: 'user_input',
      label: '开始输入',
    },
    {
      id: 'input-router',
      source: 'user_input',
      target: 'smart_router',
      label: '智能路由',
    },
    // 智能路由器的出边
    {
      id: 'router-child',
      source: 'smart_router',
      target: 'child_content',
      label: '儿童路由',
      condition: 'selectedNode',
    },
    {
      id: 'router-adult',
      source: 'smart_router',
      target: 'adult_content',
      label: '成人路由',
      condition: 'selectedNode',
    },
    {
      id: 'router-senior',
      source: 'smart_router',
      target: 'senior_content',
      label: '老年路由',
      condition: 'selectedNode',
    },
    {
      id: 'router-sports',
      source: 'smart_router',
      target: 'sports_content',
      label: '运动路由',
      condition: 'selectedNode',
    },
    {
      id: 'router-default',
      source: 'smart_router',
      target: 'default_handler',
      label: '默认路由',
      condition: 'default',
    },
    // 兴趣匹配器路由
    {
      id: 'router-matcher',
      source: 'smart_router',
      target: 'hobby_matcher',
      label: '兴趣匹配',
      condition: '${age} >= 18 && ${age} <= 65',
    },
    {
      id: 'matcher-reading',
      source: 'hobby_matcher',
      target: 'reading_content',
      label: '阅读匹配',
      condition: 'selectedNode',
    },
    {
      id: 'matcher-music',
      source: 'hobby_matcher',
      target: 'music_content',
      label: '音乐匹配',
      condition: 'selectedNode',
    },
    {
      id: 'matcher-travel',
      source: 'hobby_matcher',
      target: 'travel_content',
      label: '旅行匹配',
      condition: 'selectedNode',
    },
    {
      id: 'matcher-tech',
      source: 'hobby_matcher',
      target: 'tech_content',
      label: '科技匹配',
      condition: 'selectedNode',
    },
    {
      id: 'matcher-other',
      source: 'hobby_matcher',
      target: 'other_hobby',
      label: '其他兴趣',
      condition: 'default',
    },
    // 所有内容节点到结束节点
    {
      id: 'child-end',
      source: 'child_content',
      target: 'end',
      label: '完成',
    },
    {
      id: 'adult-end',
      source: 'adult_content',
      target: 'end',
      label: '完成',
    },
    {
      id: 'senior-end',
      source: 'senior_content',
      target: 'end',
      label: '完成',
    },
    {
      id: 'sports-end',
      source: 'sports_content',
      target: 'end',
      label: '完成',
    },
    {
      id: 'reading-end',
      source: 'reading_content',
      target: 'end',
      label: '完成',
    },
    {
      id: 'music-end',
      source: 'music_content',
      target: 'end',
      label: '完成',
    },
    {
      id: 'travel-end',
      source: 'travel_content',
      target: 'end',
      label: '完成',
    },
    {
      id: 'tech-end',
      source: 'tech_content',
      target: 'end',
      label: '完成',
    },
    {
      id: 'default-end',
      source: 'default_handler',
      target: 'end',
      label: '完成',
    },
    {
      id: 'other-end',
      source: 'other_hobby',
      target: 'end',
      label: '完成',
    },
  ],
  variables: {
    age: { type: 'number', defaultValue: 0 },
    hobby: { type: 'string', defaultValue: '' },
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};
