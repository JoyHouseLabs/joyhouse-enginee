import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Project } from './project.entity';
import { CreateProjectDto, UpdateProjectDto, ProjectQueryDto } from './dto/project.dto';
import * as fs from 'fs';
import * as path from 'path';
import { HttpException, HttpStatus } from '@nestjs/common';
import { UserService } from '../user/user.service'; // Assuming you have a UserService
import { App } from '../appstore/app.entity';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(App)
    private readonly appRepository: Repository<App>,
    private readonly userService: UserService, // For checking user permissions
  ) {}

  async create(createProjectDto: CreateProjectDto, userId: string): Promise<Project> {
    const project = this.projectRepository.create({
      ...createProjectDto,
      userId,
    });

    if (createProjectDto.appIds?.length) {
      const apps = await this.appRepository.findByIds(createProjectDto.appIds);
      project.apps = apps;
    }

    return this.projectRepository.save(project);
  }

  async findAll(query: ProjectQueryDto): Promise<{ items: Project[]; total: number; page: number; pageSize: number }> {
    const { page = 1, pageSize = 10, name, userId, recommand } = query;
    const skip = (page - 1) * pageSize;

    const queryBuilder = this.projectRepository.createQueryBuilder('project');

    if (name) {
      queryBuilder.andWhere('project.name LIKE :name', { name: `%${name}%` });
    }
    if (userId) {
      queryBuilder.andWhere('project.userId = :userId', { userId });
    }
    if (typeof recommand === 'boolean') {
      queryBuilder.andWhere('project.recommand = :recommand', { recommand });
    }

    queryBuilder.orderBy('project.createdAt', 'DESC'); // Default order

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string, userId: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id, userId },
      relations: ['apps'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, userId: string): Promise<Project> {
    const project = await this.findOne(id, userId);

    if (updateProjectDto.appIds) {
      const apps = await this.appRepository.findByIds(updateProjectDto.appIds);
      project.apps = apps;
    }

    Object.assign(project, updateProjectDto);
    return this.projectRepository.save(project);
  }

  async uploadIcon(file: Express.Multer.File): Promise<{ url: string }> {
    if (!file) {
      throw new HttpException('No file uploaded.', HttpStatus.BAD_REQUEST);
    }

    // Basic validation (can be enhanced with pipes in controller)
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype)) {
      throw new HttpException('Invalid file type. Only JPG, PNG, GIF, WEBP are allowed.', HttpStatus.BAD_REQUEST);
    }
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      throw new HttpException('File size exceeds 2MB limit.', HttpStatus.BAD_REQUEST);
    }

    // Assuming 'config.uploadDir' from main.ts is the root for uploads (e.g., './dist/public' or './uploads_root')
    // We'll place project icons in a 'project-icons' subdirectory within that.
    // The path.join here assumes __dirname is within 'dist' after build, adjust if service is elsewhere.
    const baseUploadPath = path.join(__dirname, '..', '..', '..', 'uploads'); // Adjust this path based on actual config.uploadDir root and service file location
    const projectIconsDir = path.join(baseUploadPath, 'project-icons');

    // Ensure directory exists
    if (!fs.existsSync(projectIconsDir)) {
      fs.mkdirSync(projectIconsDir, { recursive: true });
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `project-${uniqueSuffix}${extension}`; // Changed prefix for clarity
    const filePath = path.join(projectIconsDir, filename);

    try {
      fs.writeFileSync(filePath, file.buffer);
    } catch (error) {
      console.error('Error saving file:', error);
      throw new HttpException('Could not save file.', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // URL should match the prefix in main.ts and the subdirectory
    const fileUrl = `/files/uploads/project-icons/${filename}`;
    return { url: fileUrl };
  }

  async remove(id: string, userId: string): Promise<void> {
    const project = await this.findOne(id, userId);
    
    // Check user permissions (example)
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    // If not admin and not project creator, deny deletion
    if (!user.isAdmin && project.userId !== userId) {
      throw new ForbiddenException('只有管理员或项目创建者可以删除项目');
    }

    await this.projectRepository.remove(project);
  }

  async getRecommandedProjects(): Promise<Project[]> {
    return this.projectRepository.find({ where: { recommand: true }, order: { createdAt: 'DESC' } });
  }
}
