import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { JoyhouseConfigService } from '../common/joyhouse-config';
import {
  ApiTags,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiOperation,
} from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { KnowledgebaseService } from './knowledgebase.service';
import { StorageService } from '../storage/storage.service';
import { SemanticSearchService } from './services/semantic-search.service';
import { DocumentProcessingService } from './services/document-processing.service';

import { KnowledgebaseDto } from './knowledgebase.dto';
import { KnowledgebaseCreateDto } from './knowledgebase-create.dto';
import { KnowledgebaseUpdateDto } from './knowledgebase-update.dto';
import {
  KnowledgeSearchDto,
  AgentKnowledgeSearchDto,
  ChunkQueryDto,
  BatchUploadDto,
  KnowledgeSyncDto,
  KnowledgeQADto,
} from './dto/knowledge-search.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('知识库')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('knowledgebase')
export class KnowledgebaseController {
  constructor(
    private readonly kbService: KnowledgebaseService,
    private readonly storageService: StorageService,
    private readonly searchService: SemanticSearchService,
    private readonly processingService: DocumentProcessingService,
  ) {}

  /**
   * 上传文件接口，将文件信息写入 knowledgefile
   */
  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        knowledgebaseId: { type: 'string', description: '知识库ID' },
      },
      required: ['file', 'knowledgebaseId'],
    },
    description: '上传文件到知识库，并写入 knowledgefile',
  })
  @ApiResponse({ status: 201, description: '文件上传并写入成功' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('knowledgebaseId') knowledgebaseId: string,
    @Req() req,
  ) {
    const fs = require('fs');
    const path = require('path');
    const config = JoyhouseConfigService.loadConfig();
    const uploadDir = config.uploadDir;
    const domain = config.fileDomain;
    fs.mkdirSync(uploadDir, { recursive: true });
    const filename = Date.now() + '-' + file.originalname;
    const filepath = `${uploadDir}/${filename}`;
    fs.writeFileSync(filepath, file.buffer);
    const url = `${domain}/${filepath}`.replace(/\\/g, '/');
    const userId = req.user.sub;
    const kf = {
      filename,
      filepath,
      filesize: file.size,
      url,
    };
    // 创建Storage记录
    const storage = await this.storageService.createFileStorage(
      {
        filename,
        filepath,
        filesize: file.size,
        url,
        filetype: file.mimetype,
        type: 'file',
      },
      userId,
    );

    // 将Storage关联到知识库
    await this.kbService.addStorageToKnowledgebase(knowledgebaseId, storage.id);

    // 处理文档内容
    await this.processingService.processStorage(storage.id, knowledgebaseId);

    return storage;
  }

  @Get('list')
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: '页码（默认1）',
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    description: '每页数量（默认10）',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    type: String,
    description: '知识库名称模糊搜索',
  })
  @ApiResponse({
    status: 200,
    description: '分页获取知识库',
    schema: {
      example: {
        list: [
          {
            id: '01HQZK7N6QJQK0C7Y9X9X9X9X9',
            userId: '01HQZK7N6QJQK0C7Y9X9X9X9X9',
            name: '知识库A',
            icon: 'icon-url',
            description: '描述',
            typicalQuery: '示例问题',
            enableLlmParser: false,
            prompt: '',
            embedding: '',
            embeddingModel: 'text-embedding-ada-002',
            createdAt: '2024-05-08T12:00:00.000Z',
            updatedAt: '2024-05-08T12:00:00.000Z',
          },
        ],
        total: 1,
        total_page: 1,
        pageSize: 10,
      },
    },
  })
  async getAll(
    @Req() req,
    @Query() query: import('./knowledgebase-query.dto').KnowledgebaseQueryDto,
  ) {
    const userId = req.user.sub;
    const { page = 1, pageSize = 10, name } = query;
    return this.kbService.findAll(userId, page, pageSize, name);
  }

  @Get(':id')
  @ApiResponse({
    status: 200,
    type: KnowledgebaseDto,
    description: '获取单条知识库',
  })
  async getOne(@Param('id') id: string, @Req() req) {
    const userId = req.user.sub;
    return this.kbService.findById(id, userId);
  }

  @Post('create')
  @ApiBody({
    type: KnowledgebaseCreateDto,
    description: '新建知识库',
    schema: {
      example: {
        name: '知识库A',
        icon: 'icon-url',
        description: '描述',
        typicalQuery: '示例问题',
        enableLlmParser: false,
        prompt: '',
        embedding: '',
        embeddingModel: 'text-embedding-ada-002',
      },
    },
  })
  @ApiResponse({
    status: 201,
    type: KnowledgebaseDto,
    description: '创建新知识库',
    schema: {
      example: {
        id: '01HQZK7N6QJQK0C7Y9X9X9X9X9',
        userId: '01HQZK7N6QJQK0C7Y9X9X9X9X9',
        name: '知识库A',
        icon: 'icon-url',
        description: '描述',
        typicalQuery: '示例问题',
        enableLlmParser: false,
        prompt: '',
        embedding: '',
        embeddingModel: 'text-embedding-ada-002',
        createdAt: '2024-05-08T12:00:00.000Z',
        updatedAt: '2024-05-08T12:00:00.000Z',
      },
    },
  })
  async create(
    @Body() body: import('./knowledgebase-create.dto').KnowledgebaseCreateDto,
    @Req() req,
  ) {
    const userId = req.user.sub;
    return this.kbService.create(body, userId);
  }

  @Post('update')
  @ApiBody({
    type: KnowledgebaseUpdateDto,
    description: '更新知识库',
    schema: {
      example: {
        id: '01HQZK7N6QJQK0C7Y9X9X9X9X9',
        name: '知识库A',
        icon: 'icon-url',
        description: '描述',
        typicalQuery: '示例问题',
        enableLlmParser: false,
        prompt: '',
        embedding: '',
        embeddingModel: 'text-embedding-ada-002',
      },
    },
  })
  @ApiResponse({
    status: 200,
    type: KnowledgebaseDto,
    description: '更新知识库',
    schema: {
      example: {
        id: '01HQZK7N6QJQK0C7Y9X9X9X9X9',
        userId: '01HQZK7N6QJQK0C7Y9X9X9X9X9',
        name: '知识库A',
        icon: 'icon-url',
        description: '描述',
        typicalQuery: '示例问题',
        enableLlmParser: false,
        prompt: '',
        embedding: '',
        embeddingModel: 'text-embedding-ada-002',
        createdAt: '2024-05-08T12:00:00.000Z',
        updatedAt: '2024-05-08T12:00:00.000Z',
      },
    },
  })
  async update(
    @Body() body: import('./knowledgebase-update.dto').KnowledgebaseUpdateDto,
    @Req() req,
  ) {
    const userId = req.user.sub;
    return this.kbService.update(body.id, userId, body);
  }

  @Post('delete/:id')
  @ApiParam({ name: 'id', description: '知识库ID' })
  @ApiResponse({ status: 200, description: '删除知识库' })
  async delete(@Param('id') id: string, @Req() req) {
    const userId = req.user.sub;
    return this.kbService.remove(id, userId);
  }

  @Post('search')
  @ApiResponse({ status: 200, description: '语义搜索知识库' })
  async searchKnowledge(
    @Body() searchDto: KnowledgeSearchDto,
    @Req() req,
  ) {
    const userId = req.user.sub;
    return this.searchService.searchKnowledge(
      searchDto.query,
      searchDto.knowledgebaseIds,
      searchDto.options
    );
  }

  @Post('search-for-agent')
  @ApiResponse({ status: 200, description: 'Agent 专用知识库搜索' })
  async searchForAgent(
    @Body() searchDto: AgentKnowledgeSearchDto,
    @Req() req,
  ) {
    const userId = req.user.sub;
    // TODO: 从角色卡片服务获取启用的知识库列表
    // 暂时返回空数组，需要集成角色卡片服务
    const enabledKnowledgeBases: string[] = [];
    return this.searchService.searchForAgent(
      searchDto.query,
      enabledKnowledgeBases,
      searchDto.context
    );
  }

  @Get(':id/chunks')
  @ApiResponse({ status: 200, description: '获取知识库的所有知识块' })
  async getKnowledgeChunks(
    @Param('id') id: string,
    @Query() query: ChunkQueryDto,
    @Req() req,
  ) {
    const userId = req.user.sub;
    // 验证用户是否有权限访问该知识库
    await this.kbService.findById(id, userId);
    
    // 构建搜索选项
    const searchOptions = {
      limit: query.pageSize || 20,
      filters: {
        codeLanguage: query.codeLanguage,
        importance: query.minImportance,
      },
    };

    // 如果有内容搜索，使用搜索服务
    if (query.content) {
      return this.searchService.searchKnowledge(query.content, [id], searchOptions);
    }

    // 否则直接查询数据库
    return this.searchService.searchKnowledge('', [id], searchOptions);
  }

  @Post(':id/reprocess')
  @ApiResponse({ status: 200, description: '重新处理知识库文档' })
  async reprocessKnowledgebase(
    @Param('id') id: string,
    @Req() req,
  ) {
    // TODO: 实现重新处理
    return { message: '重新处理功能待实现' };
  }

  @Get(':id/statistics')
  @ApiResponse({ status: 200, description: '获取知识库统计信息' })
  async getKnowledgebaseStats(
    @Param('id') id: string,
    @Req() req,
  ) {
    // TODO: 实现统计信息
    return { message: '统计信息功能待实现' };
  }
}
