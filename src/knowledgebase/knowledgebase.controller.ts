import { Controller, Get, Post, Body, Param, Req, UseGuards, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { JoyhouseConfigService } from '../common/joyhouse-config';
import { ApiTags, ApiResponse, ApiBody, ApiParam, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { KnowledgebaseService } from './knowledgebase.service';
import { KnowledgefileService } from './knowledgefile.service';
import { KnowledgebaseDto } from './knowledgebase.dto';
import { KnowledgebaseCreateDto } from './knowledgebase-create.dto';
import { KnowledgebaseUpdateDto } from './knowledgebase-update.dto';
import { JwtAuthGuard } from '../user/jwt-auth.guard';

@ApiTags('知识库')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('knowledgebase')
export class KnowledgebaseController {
  constructor(
    private readonly kbService: KnowledgebaseService,
    private readonly kfService: KnowledgefileService
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
        knowledgebaseId: { type: 'string', description: '知识库ID' }
      },
      required: ['file', 'knowledgebaseId']
    },
    description: '上传文件到知识库，并写入 knowledgefile'
  })
  @ApiResponse({ status: 201, description: '文件上传并写入成功' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('knowledgebaseId') knowledgebaseId: string,
    @Req() req
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
      url
    };
    const knowledgefile = await this.kfService.create(kf, userId, knowledgebaseId);
    return knowledgefile;
  }

  @Get('list')
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码（默认1）' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: '每页数量（默认10）' })
  @ApiQuery({ name: 'name', required: false, type: String, description: '知识库名称模糊搜索' })
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
            updatedAt: '2024-05-08T12:00:00.000Z'
          }
        ],
        total: 1,
        total_page: 1,
        pageSize: 10
      }
    }
  })
  async getAll(@Req() req, @Query() query: import('./knowledgebase-query.dto').KnowledgebaseQueryDto) {
    const userId = req.user.sub;
    const { page = 1, pageSize = 10, name } = query;
    return this.kbService.findAll(userId, page, pageSize, name);
  }

  @Get(':id')
  @ApiResponse({ status: 200, type: KnowledgebaseDto, description: '获取单条知识库' })
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
        embeddingModel: 'text-embedding-ada-002'
      }
    }
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
        updatedAt: '2024-05-08T12:00:00.000Z'
      }
    }
  })
  async create(@Body() body: import('./knowledgebase-create.dto').KnowledgebaseCreateDto, @Req() req) {
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
        embeddingModel: 'text-embedding-ada-002'
      }
    }
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
        updatedAt: '2024-05-08T12:00:00.000Z'
      }
    }
  })
  async update(@Body() body: import('./knowledgebase-update.dto').KnowledgebaseUpdateDto, @Req() req) {
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
}
