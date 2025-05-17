import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './category.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  async create(dto: CreateCategoryDto): Promise<Category> {
    const entity = this.categoryRepo.create(dto);
    return this.categoryRepo.save(entity);
  }

  async findAll(user_id?: string): Promise<Category[]> {
    if (user_id) {
      return this.categoryRepo.find({ where: { user_id } });
    }
    return this.categoryRepo.find();
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoryRepo.findOneBy({ id });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);
    Object.assign(category, dto);
    return this.categoryRepo.save(category);
  }

  async remove(id: string): Promise<void> {
    await this.categoryRepo.delete(id);
  }
}
