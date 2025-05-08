import { Body, Controller, Get, Param, Post, Req, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../user/jwt-auth.guard';
import { LlmService } from './llm.service';
import { LlmProvider } from '../entities/llm-provider.entity';
import { LlmModel } from '../entities/llm-model.entity';
import { LlmProviderCreateDto, LlmModelCreateDto } from '../dto/llm-create.dto';
import { LlmProviderUpdateDto, LlmModelUpdateDto } from '../dto/llm-update.dto';
import { LlmProviderQueryDto, LlmModelQueryDto } from '../dto/llm-query.dto';

@ApiTags('LLM')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('llm')
export class LlmController {
  constructor(private readonly llmService: LlmService) {}

  // Provider CRUD
  @Get('provider')
  @ApiResponse({ status: 200, type: [LlmProvider] })
  @ApiBody({ type: LlmProviderQueryDto })
  async findAllProviders(@Req() req, @Query() query: LlmProviderQueryDto) {
    // 管理员可看全部
    const userId = req.user.isAdmin ? undefined : req.user.sub;
    return this.llmService.findProvidersPaged(userId, query.page ?? 1, query.limit ?? 20, query.name);
  }

  @Get('provider/:id')
  @ApiResponse({ status: 200, type: LlmProvider })
  findProviderById(@Req() req, @Param('id') id: string) {
    return this.llmService.findProviderById(id, req.user.sub);
  }

  @Post('create-provider')
  @ApiResponse({ status: 201, type: LlmProvider })
  @ApiBody({ type: LlmProviderCreateDto })
  createProvider(@Req() req, @Body() dto: LlmProviderCreateDto) {
    return this.llmService.createProvider({ ...dto, user_id: req.user.sub });
  }

  @Post('provider/update')
  @ApiResponse({ status: 200 })
  @ApiBody({ type: LlmProviderUpdateDto })
  updateProvider(@Req() req, @Body() dto: LlmProviderUpdateDto) {
    const { id, ...rest } = dto;
    return this.llmService.updateProvider(id, { ...rest, user_id: req.user.sub });
  }

  @Post('provider/:id/delete')
  @ApiParam({ name: 'id', description: '要删除的 Provider ID' })
  @ApiResponse({ status: 200, description: '删除 provider，返回是否成功' })
  async deleteProvider(@Param('id') id: string, @Req() req): Promise<{ success: boolean }> {
    const userId = req.user.sub;
    const result = await this.llmService.deleteProvider(id, userId);
    return { success: !!result.affected };
  }

  // Model CRUD
  @Get('model')
  @ApiResponse({ status: 200, type: [LlmModel] })
  @ApiBody({ type: LlmModelQueryDto })
  async findAllModels(@Req() req, @Query() query: LlmModelQueryDto) {
    // 管理员可看全部
    const userId = req.user.isAdmin ? undefined : req.user.sub;
    return this.llmService.findModelsPaged(userId, query.page ?? 1, query.limit ?? 20, query.name, query.provider);
  }

  @Get('model/:id')
  @ApiResponse({ status: 200, type: LlmModel })
  findModelById(@Req() req, @Param('id') id: string) {
    return this.llmService.findModelById(id, req.user.sub);
  }

  @Post('create-model')
  @ApiResponse({ status: 201, type: LlmModel })
  @ApiBody({ type: LlmModelCreateDto })
  createModel(@Req() req, @Body() dto: LlmModelCreateDto) {
    // 将 providerId 传递给 service，service 负责查找并赋值
    const { provider, ...rest } = dto;
    return this.llmService.createModel({ ...rest, providerId: provider, user_id: req.user.sub });
  }

  @Post('model/update')
  @ApiResponse({ status: 200 })
  @ApiBody({ type: LlmModelUpdateDto })
  updateModel(@Req() req, @Body() dto: LlmModelUpdateDto) {
    const { id, provider, ...rest } = dto;
    return this.llmService.updateModel(id, { ...rest, providerId: provider, user_id: req.user.sub });
  }

  @Post('model/:id/delete')
  @ApiParam({ name: 'id', description: '要删除的模型 ID' })
  @ApiResponse({ status: 200, description: '删除模型，返回是否成功' })
  async deleteModel(@Param('id') id: string, @Req() req): Promise<{ success: boolean }> {
    const userId = req.user.sub;
    const result = await this.llmService.deleteModel(id, userId);
    return { success: !!result.affected };
  }
}
