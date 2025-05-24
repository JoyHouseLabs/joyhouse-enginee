import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tool, ToolType, HttpMethod } from './entities/tool.entity';
import { CreateToolDto, UpdateToolDto } from './dto/tool.dto';
import { User } from '../user/user.entity';
import axios, { AxiosRequestConfig } from 'axios';
import { Observable } from 'rxjs';
import { WebSocket } from 'ws';

@Injectable()
export class ToolService {
  constructor(
    @InjectRepository(Tool)
    private readonly toolRepository: Repository<Tool>,
  ) {}

  async create(createToolDto: CreateToolDto, user: User): Promise<Tool> {
    const tool = this.toolRepository.create({
      ...createToolDto,
      user,
    });
    return this.toolRepository.save(tool);
  }

  async findAll(user: User): Promise<Tool[]> {
    return this.toolRepository.find({
      where: [
        { user: { id: user.id } },
        { isPublic: true }
      ],
    });
  }

  async findOne(id: string, user: User): Promise<Tool> {
    const tool = await this.toolRepository.findOne({
      where: [
        { id, user: { id: user.id } },
        { id, isPublic: true }
      ],
    });

    if (!tool) {
      throw new NotFoundException(`Tool with ID ${id} not found`);
    }

    return tool;
  }

  async update(id: string, updateToolDto: UpdateToolDto, user: User): Promise<Tool> {
    const tool = await this.findOne(id, user);
    Object.assign(tool, updateToolDto);
    return this.toolRepository.save(tool);
  }

  async remove(id: string, user: User): Promise<void> {
    const tool = await this.findOne(id, user);
    await this.toolRepository.remove(tool);
  }

  async execute(toolId: string, params: Record<string, any>, user: User): Promise<any> {
    const tool = await this.findOne(toolId, user);
    
    switch (tool.type) {
      case ToolType.HTTP:
        return this.executeHttpRequest(tool, params);
      case ToolType.SSE:
        return this.executeSseRequest(tool, params);
      case ToolType.WEBSOCKET:
        return this.executeWebSocketRequest(tool, params);
      default:
        throw new Error(`Unsupported tool type: ${tool.type}`);
    }
  }

  async generateToolPrompt(user: User): Promise<string> {
    const tools = await this.findAll(user);
    
    let prompt = "你是一个智能助手，可以使用以下工具来帮助用户：\n\n";
    
    tools.forEach((tool, index) => {
      prompt += `工具 ${index + 1}: ${tool.name}\n`;
      prompt += `描述: ${tool.description || '无描述'}\n`;
      prompt += `类型: ${tool.type}\n`;
      prompt += `URL: ${tool.url}\n`;
      
      if (tool.prompt) {
        prompt += `使用场景: ${tool.prompt}\n`;
      }
      
      if (tool.requestParams) {
        prompt += `参数说明:\n`;
        if (tool.requestParams.query) {
          prompt += `  查询参数: ${JSON.stringify(tool.requestParams.query, null, 2)}\n`;
        }
        if (tool.requestParams.body) {
          prompt += `  请求体: ${JSON.stringify(tool.requestParams.body, null, 2)}\n`;
        }
        if (tool.requestParams.path) {
          prompt += `  路径参数: ${JSON.stringify(tool.requestParams.path, null, 2)}\n`;
        }
      }
      
      if (tool.fewShot && tool.fewShot.length > 0) {
        prompt += `使用示例:\n`;
        tool.fewShot.forEach((example, exampleIndex) => {
          prompt += `  示例 ${exampleIndex + 1}:\n`;
          prompt += `    输入: ${example.input}\n`;
          prompt += `    输出: ${JSON.stringify(example.output, null, 2)}\n`;
          if (example.description) {
            prompt += `    说明: ${example.description}\n`;
          }
        });
      }
      
      prompt += "\n";
    });
    
    prompt += `
使用工具的格式：
当你需要使用工具时，请按照以下JSON格式回复：
{
  "action": "use_tool",
  "tool_name": "工具名称",
  "parameters": {
    "参数名": "参数值"
  }
}

请根据用户的问题选择合适的工具并提供正确的参数。如果不需要使用工具，请直接回答用户的问题。
`;
    
    return prompt;
  }

  async getToolsForLLM(user: User): Promise<Array<{
    name: string;
    description: string;
    parameters: any;
    examples?: any[];
  }>> {
    const tools = await this.findAll(user);
    
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description || tool.prompt || '无描述',
      parameters: {
        type: 'object',
        properties: this.extractParametersFromTool(tool),
        required: this.getRequiredParameters(tool)
      },
      examples: tool.fewShot || []
    }));
  }

  private extractParametersFromTool(tool: Tool): Record<string, any> {
    const parameters: Record<string, any> = {};
    
    if (tool.requestParams) {
      if (tool.requestParams.query) {
        Object.keys(tool.requestParams.query).forEach(key => {
          parameters[key] = {
            type: 'string',
   
            description: `查询参数: ${key}`
          };
        });
      }
      
      if (tool.requestParams.body) {
        Object.keys(tool.requestParams.body).forEach(key => {
          parameters[key] = {
            type: 'string',
            description: `请求体参数: ${key}`
          };
        });
      }
      
      if (tool.requestParams.path) {
        Object.keys(tool.requestParams.path).forEach(key => {
          parameters[key] = {
            type: 'string',
            description: `路径参数: ${key}`
          };
        });
      }
    }
    
    return parameters;
  }

  private getRequiredParameters(tool: Tool): string[] {
    const required: string[] = [];
    
    if (tool.requestParams?.path) {
      required.push(...Object.keys(tool.requestParams.path));
    }
    
    return required;
  }

  private async executeHttpRequest(tool: Tool, params: Record<string, any>): Promise<any> {
    const config: AxiosRequestConfig = {
      method: tool.method || HttpMethod.GET,
      url: this.buildUrl(tool.url, params),
      headers: tool.headers || {},
    };

    // Add authentication
    if (tool.auth) {
      this.addAuthToConfig(config, tool.auth);
    }

    // Add request parameters
    if (tool.requestParams) {
      if (tool.requestParams.query) {
        config.params = tool.requestParams.query;
      }
      if (tool.requestParams.body && ['POST', 'PUT', 'PATCH'].includes(tool.method || '')) {
        config.data = tool.requestParams.body;
      }
    }

    const response = await axios(config);
    return response.data;
  }

  private executeSseRequest(tool: Tool, params: Record<string, any>): Observable<any> {
    return new Observable(subscriber => {
      const url = this.buildUrl(tool.url, params);
      const eventSource = new EventSource(url);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          subscriber.next(data);
        } catch (error) {
          subscriber.error(error);
        }
      };

      eventSource.onerror = (error) => {
        subscriber.error(error);
        eventSource.close();
      };

      return () => {
        eventSource.close();
      };
    });
  }

  private executeWebSocketRequest(tool: Tool, params: Record<string, any>): Observable<any> {
    return new Observable(subscriber => {
      const url = this.buildUrl(tool.url, params);
      const ws = new WebSocket(url);

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          subscriber.next(message);
        } catch (error) {
          subscriber.error(error);
        }
      });

      ws.on('error', (error) => {
        subscriber.error(error);
        ws.close();
      });

      ws.on('close', () => {
        subscriber.complete();
      });

      return () => {
        ws.close();
      };
    });
  }

  private buildUrl(url: string, params: Record<string, any>): string {
    let finalUrl = url;
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        finalUrl = finalUrl.replace(`:${key}`, encodeURIComponent(String(value)));
      });
    }
    return finalUrl;
  }

  private addAuthToConfig(config: AxiosRequestConfig, auth: Tool['auth']): void {
    if (!auth) return;

    switch (auth.type) {
      case 'basic':
        if (auth.username && auth.password) {
          config.auth = {
            username: auth.username,
            password: auth.password,
          };
        }
        break;
      case 'bearer':
        if (auth.token) {
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${auth.token}`,
          };
        }
        break;
      case 'apiKey':
        if (auth.key && auth.value) {
          if (auth.in === 'header') {
            config.headers = {
              ...config.headers,
              [auth.key]: auth.value,
            };
          } else if (auth.in === 'query') {
            config.params = {
              ...config.params,
              [auth.key]: auth.value,
            };
          }
        }
        break;
    }
  }
} 