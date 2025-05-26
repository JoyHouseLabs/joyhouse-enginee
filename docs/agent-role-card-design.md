# Agent RoleCard 设计文档

## 概述

RoleCard（角色卡片）是 Agent 模块的核心功能之一，旨在为 Agent 提供多角色、多模式的工作能力。通过角色卡片，Agent 可以根据不同的任务场景切换角色，如"软件开发工程师"、"产品经理"、"英语教练"等，每个角色都有独立的配置和行为模式。

## 设计目标

1. **多角色支持**：Agent 可以拥有多个角色，根据任务需要动态切换
2. **配置隔离**：每个角色有独立的提示词、工具、知识库等配置
3. **记忆管理**：支持短期和长期记忆的独立配置
4. **工具集成**：角色可以配置特定的工具、MCP工具、工作流和知识库
5. **协作支持**：支持多 Agent 协作时的角色同步
6. **可复用性**：角色卡片可以在多个 Agent 间共享使用

## 核心实体设计

### RoleCard 实体

```typescript
@Entity('role_card')
export class RoleCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // 角色名称

  @Column({ type: 'text', nullable: true })
  description?: string; // 角色描述

  @Column({ type: 'text' })
  systemPrompt: string; // 系统提示词

  @Column({ type: 'text', nullable: true })
  userPrompt?: string; // 用户提示词模板

  // 短期记忆配置
  @Column({ type: 'json', nullable: true })
  shortTermMemoryConfig?: {
    maxContextLength: number; // 短期记忆最大长度
    contextRetentionTime: number; // 上下文保留时间（分钟）
    priorityKeywords: string[]; // 优先保留的关键词
  };

  // 长期记忆配置
  @Column({ type: 'json', nullable: true })
  longTermMemoryConfig?: {
    knowledgeCategories: string[]; // 知识分类
    memoryRetentionDays: number; // 记忆保留天数
    autoSummarize: boolean; // 是否自动总结
  };

  // LLM 参数配置
  @Column({ type: 'json', nullable: true })
  llmParams?: {
    model: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stop?: string[];
  };

  // 意图识别配置
  @Column({ type: 'json', nullable: true })
  intentRecognitionConfig?: {
    enabled: boolean;
    confidence_threshold: number;
    max_intents: number;
    custom_intents: Array<{
      id: string;
      name: string;
      description: string;
      examples: string[];
      required_parameters: string[];
    }>;
  };

  // 启用的工具和服务
  @Column({ type: 'json', nullable: true })
  enabledTools?: string[]; // 启用的工具ID列表

  @Column({ type: 'json', nullable: true })
  enabledMcpTools?: string[]; // 启用的MCP工具ID列表

  @Column({ type: 'json', nullable: true })
  enabledWorkflows?: string[]; // 启用的工作流ID列表

  @Column({ type: 'json', nullable: true })
  enabledKnowledgeBases?: string[]; // 启用的知识库ID列表

  // 角色特定设置
  @Column({ type: 'json', nullable: true })
  roleSpecificSettings?: {
    autoGreeting?: string; // 自动问候语
    conversationStyle?: 'formal' | 'casual' | 'professional' | 'friendly';
    responseLength?: 'short' | 'medium' | 'long';
    expertise_level?: 'beginner' | 'intermediate' | 'expert';
    language_preference?: string;
  };

  @Column({ default: true })
  isActive: boolean; // 是否激活

  @Column({ default: false })
  isPublic: boolean; // 是否公开

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>; // 额外的元数据

  @ManyToOne(() => User)
  user: User; // 创建者

  @ManyToMany(() => Agent, agent => agent.roleCards)
  agents: Agent[]; // 使用此角色卡的 agents
}
```

### Agent 实体扩展

```typescript
@Entity('agent')
export class Agent {
  // ... 原有字段

  @Column({ nullable: true })
  currentRoleCardId?: string; // 当前激活的角色卡片ID

  @ManyToMany(() => RoleCard, roleCard => roleCard.agents)
  @JoinTable({
    name: 'agent_role_cards',
    joinColumn: { name: 'agentId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'roleCardId', referencedColumnName: 'id' }
  })
  roleCards: RoleCard[];

  // ... 其他字段
}
```

## API 接口设计

### RoleCard 管理接口

```typescript
// 创建角色卡片
POST /api/agent/role-cards
Body: CreateRoleCardDto

// 获取我的角色卡片列表
GET /api/agent/role-cards/my?page=1&pageSize=12&name=

// 获取公开的角色卡片列表
GET /api/agent/role-cards/public?page=1&pageSize=12&name=

// 获取指定角色卡片
GET /api/agent/role-cards/:id

// 更新角色卡片
PATCH /api/agent/role-cards/:id
Body: UpdateRoleCardDto

// 删除角色卡片
DELETE /api/agent/role-cards/:id
```

### Agent 与 RoleCard 关联接口

```typescript
// 为 Agent 添加角色卡片
POST /api/agent/:agentId/role-cards/:roleCardId

// 从 Agent 移除角色卡片
DELETE /api/agent/:agentId/role-cards/:roleCardId

// 切换 Agent 的角色卡片
POST /api/agent/:agentId/switch-role-card/:roleCardId

// 获取 Agent 的当前角色卡片
GET /api/agent/:agentId/current-role-card

// 使用角色卡片与 Agent 对话
POST /api/agent/:agentId/conversations/:conversationId/chat-with-role
Body: ChatRequestDto
```

## 核心功能实现

### 1. 角色切换机制

当 Agent 切换角色卡片时，系统会：

1. 更新 `currentRoleCardId` 字段
2. 应用角色卡片的 LLM 参数配置
3. 更新意图识别配置
4. 更新启用的工具、MCP工具、工作流列表
5. 更新短期记忆中的角色信息

```typescript
async switchAgentRoleCard(agentId: string, roleCardId: string, user: User): Promise<Agent> {
  const agent = await this.agentRepo.findOne({
    where: { id: agentId, user: { id: user.id } },
    relations: ['roleCards'],
  });

  const roleCard = agent.roleCards.find(rc => rc.id === roleCardId);
  
  // 更新当前激活的角色卡片
  agent.currentRoleCardId = roleCardId;

  // 应用角色卡片配置
  if (roleCard.llmParams) {
    agent.llmParams = { ...agent.llmParams, ...roleCard.llmParams };
  }

  // 更新短期记忆
  if (!agent.shortTermMemory) {
    agent.shortTermMemory = { context: '', lastInteraction: new Date() };
  }
  agent.shortTermMemory.activeRole = roleCard.name;
  agent.shortTermMemory.activePrompt = roleCard.systemPrompt;

  return this.agentRepo.save(agent);
}
```

### 2. 基于角色的对话

使用角色卡片进行对话时，系统会：

1. 获取当前激活的角色卡片
2. 使用角色卡片的系统提示词
3. 应用角色特定的 LLM 参数
4. 根据角色配置调用相应的工具和服务

```typescript
async chatWithRoleCard(
  agentId: string,
  conversationId: string,
  chatRequestDto: ChatRequestDto,
  user: User,
): Promise<any> {
  const currentRoleCard = await this.getCurrentRoleCard(agentId, user);
  
  // 使用角色卡片的配置进行对话
  const messages = [
    {
      role: 'system' as const,
      content: currentRoleCard.systemPrompt,
    },
    // ... 对话历史
  ];

  // 使用角色卡片的 LLM 参数
  const llmParams = currentRoleCard.llmParams || agent.llmParams || {};
  const response = await this.llmService.chat({
    model: llmParams.model || 'gpt-3.5-turbo',
    messages,
    temperature: llmParams.temperature || 0.7,
    maxTokens: llmParams.maxTokens || 1000,
  });

  return response;
}
```

### 3. 记忆管理

#### 短期记忆
- 存储当前会话的上下文信息
- 记录当前激活的角色和提示词
- 根据角色配置管理上下文长度和保留时间

#### 长期记忆
- 按知识分类存储长期积累的信息
- 支持自动总结功能
- 根据角色配置管理记忆保留策略

### 4. 工具和服务集成

每个角色卡片可以配置：

- **工具（Tools）**：特定的功能工具
- **MCP工具**：Model Context Protocol 工具
- **工作流（Workflows）**：自动化流程
- **知识库（Knowledge Bases）**：专业知识库

角色切换时，Agent 会自动更新可用的工具和服务列表。

## 使用场景示例

### 1. 软件开发工程师角色

```json
{
  "name": "软件开发工程师",
  "description": "专业的软件开发专家，擅长代码编写、架构设计和技术问题解决",
  "systemPrompt": "你是一名资深的软件开发工程师，具有丰富的编程经验...",
  "llmParams": {
    "model": "gpt-4",
    "temperature": 0.2,
    "maxTokens": 2000
  },
  "enabledTools": ["code-generator", "code-reviewer", "git-helper"],
  "enabledKnowledgeBases": ["programming-docs", "api-references"],
  "roleSpecificSettings": {
    "conversationStyle": "professional",
    "expertise_level": "expert",
    "responseLength": "medium"
  }
}
```

### 2. 英语教练角色

```json
{
  "name": "英语教练",
  "description": "专业的英语学习指导老师，提供个性化的英语学习建议",
  "systemPrompt": "你是一名专业的英语教练，擅长英语教学和学习指导...",
  "llmParams": {
    "model": "gpt-3.5-turbo",
    "temperature": 0.7,
    "maxTokens": 1500
  },
  "enabledTools": ["grammar-checker", "pronunciation-guide"],
  "enabledKnowledgeBases": ["english-grammar", "vocabulary-database"],
  "roleSpecificSettings": {
    "conversationStyle": "friendly",
    "expertise_level": "intermediate",
    "responseLength": "medium",
    "language_preference": "en"
  }
}
```

## 数据库迁移

创建角色卡片相关的数据库表：

```sql
-- 创建角色卡片表
CREATE TABLE role_card (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  user_prompt TEXT,
  short_term_memory_config JSON,
  long_term_memory_config JSON,
  llm_params JSON,
  intent_recognition_config JSON,
  enabled_tools JSON,
  enabled_mcp_tools JSON,
  enabled_workflows JSON,
  enabled_knowledge_bases JSON,
  role_specific_settings JSON,
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT false,
  metadata JSON,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建 Agent 和 RoleCard 的关联表
CREATE TABLE agent_role_cards (
  agent_id UUID REFERENCES agent(id) ON DELETE CASCADE,
  role_card_id UUID REFERENCES role_card(id) ON DELETE CASCADE,
  PRIMARY KEY (agent_id, role_card_id)
);

-- 为 Agent 表添加当前角色卡片字段
ALTER TABLE agent ADD COLUMN current_role_card_id UUID REFERENCES role_card(id);
```

## 前端集成建议

### 1. 角色卡片管理界面
- 角色卡片列表页面
- 角色卡片创建/编辑表单
- 角色配置的可视化编辑器

### 2. Agent 角色切换界面
- 角色选择下拉框
- 当前角色状态显示
- 角色切换确认对话框

### 3. 对话界面增强
- 显示当前激活的角色
- 角色特定的 UI 样式
- 角色相关的快捷操作

## 扩展性考虑

### 1. 角色模板市场
- 支持角色卡片的导入/导出
- 社区角色模板分享
- 角色卡片版本管理

### 2. 动态角色学习
- 根据用户反馈优化角色配置
- 自动学习用户偏好
- 角色行为分析和改进

### 3. 多模态角色
- 支持语音、图像等多模态输入
- 角色特定的多模态处理能力
- 跨模态的角色一致性

## 总结

RoleCard 设计为 Agent 系统提供了强大的多角色支持能力，通过角色卡片的配置和切换，Agent 可以在不同的专业领域和工作场景中发挥专业能力。这种设计不仅提高了 Agent 的适用性和专业性，也为用户提供了更加个性化和精准的服务体验。 