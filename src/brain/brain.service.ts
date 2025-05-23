import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LlmModel } from '../llm/llm-model.entity';
import { LlmProvider } from '../llm/llm-provider.entity';

@Injectable()
export class BrainService {
  constructor(
    @InjectRepository(LlmModel)
    private readonly modelRepo: Repository<LlmModel>,
    @InjectRepository(LlmProvider)
    private readonly providerRepo: Repository<LlmProvider>,
  ) {}

  private async getDefaultModel(userId: string): Promise<LlmModel | null> {
    return this.modelRepo.findOne({
      where: { user_id: userId, is_default: true },
      relations: ['provider'],
    });
  }

  private async callOllama(model: LlmModel, content: string) {
    // TODO: 实现 Ollama API 调用
    const response = await fetch(`${model.provider.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.name,
        prompt: this.buildPrompt(content),
        stream: false,
      }),
    });
    return response.json();
  }

  private async callOpenAI(model: LlmModel, content: string) {
    const response = await fetch(`${model.provider.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${model.provider.apiKey}`,
      },
      body: JSON.stringify({
        model: model.name,
        messages: [
          {
            role: 'system',
            content: `你是一个专业的心理咨询师，擅长帮助用户进行觉察和反思。请帮助分析用户输入的内容，并按照以下结构输出：

事件：客观描述发生了什么，不包含主观评价

感受：
- 生理：身体反应（如：心跳加快、出汗等）
- 情绪：当下的情绪状态
- 行为冲动：想要采取的行动
- 自动思维：脑海中闪过的想法

防御：
- 合理化：如何解释或掩饰
- 补偿行为：采取了什么补偿措施
- 否认脆弱性：如何否认或回避

分析：
- 触发点分析：事件与过往经验的联系
- 模式识别：重复出现的应对方式
- 影响分析：防御机制带来的影响
- 改进建议：下次可以如何应对

示例：
事件：今天部门会议做季度汇报时，我突然忘记了一个关键数据，在台上愣住5秒后跳过了这部分内容。

感受：
- 生理：喉咙发紧，手心出汗
- 情绪：害怕同事觉得我不专业
- 行为冲动：想立刻逃离会议室
- 自动思维：内心有个声音说「你果然不适合当负责人」

防御：
- 合理化：会后立刻开玩笑说「最近加班太多记忆力衰退」
- 补偿行为：刻意在茶水间大声讨论其他项目成果
- 否认脆弱性：自我安慰「反正没人认真听报告」

分析：
- 触发点源于童年时忘词被同学嘲笑的记忆重现
- 用幽默掩饰失误是家族常见的应对方式
- 防御机制虽然暂时缓解焦虑，但阻碍了直接承认错误的坦诚沟通
- 下次可尝试：「刚才的数据我需要再确认，稍后同步给大家」的应对方式`,
          },
          {
            role: 'user',
            content: content,
          },
        ],
      }),
    });
    return response.json();
  }

  private buildPrompt(content: string): string {
    return `你是一个专业的心理咨询师，擅长帮助用户进行觉察和反思。请帮助分析以下内容，并按照以下结构输出：

事件：客观描述发生了什么，不包含主观评价

感受：
- 生理：身体反应（如：心跳加快、出汗等）
- 情绪：当下的情绪状态
- 行为冲动：想要采取的行动
- 自动思维：脑海中闪过的想法

防御：
- 合理化：如何解释或掩饰
- 补偿行为：采取了什么补偿措施
- 否认脆弱性：如何否认或回避

分析：
- 触发点分析：事件与过往经验的联系
- 模式识别：重复出现的应对方式
- 影响分析：防御机制带来的影响
- 改进建议：下次可以如何应对

示例：
事件：今天部门会议做季度汇报时，我突然忘记了一个关键数据，在台上愣住5秒后跳过了这部分内容。

感受：
- 生理：喉咙发紧，手心出汗
- 情绪：害怕同事觉得我不专业
- 行为冲动：想立刻逃离会议室
- 自动思维：内心有个声音说「你果然不适合当负责人」

防御：
- 合理化：会后立刻开玩笑说「最近加班太多记忆力衰退」
- 补偿行为：刻意在茶水间大声讨论其他项目成果
- 否认脆弱性：自我安慰「反正没人认真听报告」

分析：
- 触发点源于童年时忘词被同学嘲笑的记忆重现
- 用幽默掩饰失误是家族常见的应对方式
- 防御机制虽然暂时缓解焦虑，但阻碍了直接承认错误的坦诚沟通
- 下次可尝试：「刚才的数据我需要再确认，稍后同步给大家」的应对方式

请分析以下内容：
${content}`;
  }

  private parseLLMResponse(response: any) {
    // 根据不同的 LLM 响应格式解析结果
    if (response.choices?.[0]?.message?.content) {
      // OpenAI 格式
      return this.parseStructuredContent(response.choices[0].message.content);
    } else if (response.response) {
      // Ollama 格式
      return this.parseStructuredContent(response.response);
    }
    throw new Error('Unsupported LLM response format');
  }

  private parseStructuredContent(content: string) {
    const lines = content.split('\n');
    const result: any = {
      event: '',
      feelings: '',
      defense: '',
      analysis: ''
    };
    let currentSection = '';
    let buffer: string[] = [];

    const flushBuffer = () => {
      if (currentSection && buffer.length) {
        result[currentSection] = buffer.join('\n').trim();
        buffer = [];
      }
    };

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (trimmedLine.startsWith('事件：')) {
        flushBuffer();
        currentSection = 'event';
        result.event = trimmedLine.replace('事件：', '').trim();
      } else if (trimmedLine.startsWith('感受：')) {
        flushBuffer();
        currentSection = 'feelings';
      } else if (trimmedLine.startsWith('防御：')) {
        flushBuffer();
        currentSection = 'defense';
      } else if (trimmedLine.startsWith('分析：')) {
        flushBuffer();
        currentSection = 'analysis';
      } else if (currentSection && currentSection !== 'event') {
        buffer.push(trimmedLine);
      }
    }
    flushBuffer();
    return result;
  }

  async structureContent(content: string, userId: string) {
    const model = await this.getDefaultModel(userId);
    if (!model) {
      throw new Error('No default model found');
    }

    let response;
    if (model.provider.apiType === 'ollama') {
      response = await this.callOllama(model, content);
    } else if (model.provider.apiType === 'openai') {
      response = await this.callOpenAI(model, content);
    } else {
      throw new Error('Unsupported provider type');
    }

    return this.parseLLMResponse(response);
  }

  async *streamStructureContent(content: string, userId: string) {
    const model = await this.getDefaultModel(userId);
    if (!model) {
      throw new Error('No default model found');
    }

    // TODO: 实现流式调用
    // 这里需要根据不同的 provider 类型实现不同的流式调用逻辑
    yield { data: JSON.stringify({ event: '示例事件' }) };
    yield { data: JSON.stringify({ feelings: '示例感受' }) };
    yield { data: JSON.stringify({ defense: '示例防御' }) };
    yield { data: JSON.stringify({ analysis: '示例分析' }) };
  }
} 