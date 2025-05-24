import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto } from './category.dto';
import { Category } from './category.entity';

@ApiTags('Category')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @ApiOperation({ summary: '创建分类' })
  @ApiResponse({ status: 201, type: Category })
  async create(@Body() dto: CreateCategoryDto): Promise<Category> {
    return this.categoryService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '获取所有分类' })
  @ApiResponse({ status: 200, type: [Category] })
  async findAll(@Query('user_id') user_id?: string): Promise<Category[]> {
    return this.categoryService.findAll(user_id);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个分类' })
  @ApiResponse({ status: 200, type: Category })
  async findOne(@Param('id') id: string): Promise<Category> {
    return this.categoryService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新分类' })
  @ApiResponse({ status: 200, type: Category })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<Category> {
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除分类' })
  @ApiResponse({ status: 204 })
  async remove(@Param('id') id: string): Promise<void> {
    return this.categoryService.remove(id);
  }
}
