import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LlmService } from './llm.service';
import { LlmProvider } from './llm-provider.entity';
import { LlmModel } from './llm-model.entity';
import { LlmProviderCreateDto, LlmModelCreateDto } from './llm-create.dto';
import { LlmProviderUpdateDto, LlmModelUpdateDto } from './llm-update.dto';
import { LlmProviderQueryDto, LlmModelQueryDto } from './llm-query.dto';

@ApiTags('LLM')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('llm')
export class LlmController {
  constructor(private readonly llmService: LlmService) {}

  // Provider CRUD
  @Get('provider/list')
  @ApiResponse({ status: 200, type: [LlmProvider] })
  @ApiBody({ type: LlmProviderQueryDto })
  async findAllProviders(@Req() req, @Query() query: LlmProviderQueryDto) {
    console.log('Request user:', req.user);
    const userId = req.user.id;
    const result = await this.llmService.findProvidersPaged(
      userId,
      query.page ?? 1,
      query.limit ?? 20,
      query.name,
      query.isPublic,
    );

    // 为每个 provider 添加模型数量
    const providersWithModelCount = await Promise.all(
      result.list.map(async (provider) => {
        const modelCount = await this.llmService.countModelsByProvider(
          provider.id,
        );
        return { ...provider, modelCount };
      }),
    );

    return { ...result, list: providersWithModelCount };
  }

  @Get('provider/:id')
  @ApiResponse({ status: 200, type: LlmProvider })
  findProviderById(@Req() req, @Param('id') id: string) {
    return this.llmService.findProviderById(id, req.user.id);
  }

  @Post('provider/create')
  @ApiResponse({ status: 201, type: LlmProvider })
  @ApiBody({ type: LlmProviderCreateDto })
  createProvider(@Req() req, @Body() dto: LlmProviderCreateDto) {
    return this.llmService.createProvider({ ...dto, userId: req.user.id });
  }

  @Post('provider/update')
  @ApiResponse({ status: 200 })
  @ApiBody({ type: LlmProviderUpdateDto })
  updateProvider(@Req() req, @Body() dto: LlmProviderUpdateDto) {
    const { id, ...rest } = dto;
    return this.llmService.updateProvider(id, {
      ...rest,
      userId: req.user.id,
    });
  }

  @Post('provider/delete')
  @ApiResponse({ status: 200, description: '删除 provider，返回是否成功' })
  async deleteProvider(
    @Body() body: { id: string },
    @Req() req,
  ): Promise<{ success: boolean }> {
    const userId = req.user.id;
    const result = await this.llmService.deleteProvider(body.id, userId);
    return { success: !!result.affected };
  }

  // Model CRUD
  /**
   * 获取模型列表，可选参数provider_id用于查询特定provider下的模型
   * @param query.provider 指定provider的ID
   */
  @Get('models')
  @ApiResponse({ status: 200, type: [LlmModel] })
  @ApiBody({ type: LlmModelQueryDto })
  async findAllModels(@Req() req, @Query() query: LlmModelQueryDto) {
    const userId = req.user.id;
    return this.llmService.findModelsPaged(
      userId,
      query.page ?? 1,
      query.limit ?? 20,
      query.name,
      query.provider,
      query.isPublic,
    );
  }

  @Get('model/:id')
  @ApiResponse({ status: 200, type: LlmModel })
  findModelById(@Req() req, @Param('id') id: string) {
    return this.llmService.findModelById(id, req.user.id);
  }

  @Post('model/create')
  @ApiResponse({ status: 201, type: LlmModel })
  @ApiBody({ type: LlmModelCreateDto })
  createModel(@Req() req, @Body() dto: LlmModelCreateDto) {
    const { provider, ...rest } = dto;
    return this.llmService.createModel({
      ...rest,
      providerId: provider,
      userId: req.user.id,
    });
  }

  @Post('model/update')
  @ApiResponse({ status: 200 })
  @ApiBody({ type: LlmModelUpdateDto })
  updateModel(@Req() req, @Body() dto: LlmModelUpdateDto) {
    const { id, provider, ...rest } = dto;
    return this.llmService.updateModel(id, {
      ...rest,
      providerId: provider,
      userId: req.user.id,
    });
  }

  @Post('model/delete')
  @ApiBody({
    schema: {
      properties: { id: { type: 'string', description: '要删除的模型 ID' } },
      required: ['id'],
    },
  })
  @ApiResponse({ status: 200, description: '删除模型，返回是否成功' })
  async deleteModel(
    @Body() body: { id: string },
    @Req() req,
  ): Promise<{ success: boolean }> {
    const userId = req.user.id;
    const result = await this.llmService.deleteModel(body.id, userId);
    return { success: !!result.affected };
  }

  @Post('model/set-default')
  @ApiBody({
    schema: {
      properties: { id: { type: 'string', description: '要设为默认的模型ID' } },
      required: ['id'],
    },
  })
  @ApiResponse({ status: 200, description: '设置默认模型，返回是否成功' })
  async setDefaultModel(
    @Req() req,
    @Body() body: { id: string },
  ): Promise<{ success: boolean }> {
    const userId = req.user.id;
    const result = await this.llmService.setDefaultModel(body.id, userId);
    return { success: result };
  }
}
