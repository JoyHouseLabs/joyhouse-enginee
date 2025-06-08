import { Controller, Get, Post, Body, Param, Query, UseGuards, Delete, Patch, ParseUUIDPipe, Req, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectService } from './project.service';
import { Project } from './project.entity';
import { CreateProjectDto, UpdateProjectDto, ProjectQueryDto, ProjectDto } from './dto/project.dto';
import { User } from '../user/user.decorator'; // Assuming you have a User decorator to get current user

@ApiTags('项目管理')
@ApiBearerAuth()
@Controller('projects') // Changed from 'project' to 'projects' for RESTful convention
@UseGuards(JwtAuthGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @ApiOperation({ summary: '创建新项目' })
  @ApiResponse({ status: 201, description: '项目创建成功', type: ProjectDto })
  create(@Req() req, @Body() createProjectDto: CreateProjectDto) {
    return this.projectService.create(createProjectDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: '获取项目列表 (分页)' })
  @ApiResponse({ status: 200, description: '获取成功', type: [ProjectDto] })
  findAll(@Req() req, @Query() query: ProjectQueryDto) {
    return this.projectService.findAll({
      ...query,
      userId: req.user.id
    });
  }

  @Get('recommanded')
  @ApiOperation({ summary: '获取推荐项目列表' })
  @ApiResponse({ status: 200, description: '获取成功', type: [ProjectDto] })
  async getRecommandedProjects(): Promise<Project[]> {
    return this.projectService.getRecommandedProjects();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取项目详情' })
  @ApiResponse({ status: 200, description: '获取成功', type: ProjectDto })
  @ApiResponse({ status: 404, description: '项目未找到' })
  findOne(@Param('id') id: string, @Req() req) {
    return this.projectService.findOne(id, req.user.id);
  }

  @Patch(':id') // Using PATCH for partial updates
  @ApiOperation({ summary: '更新项目信息' })
  @ApiResponse({ status: 200, description: '更新成功', type: ProjectDto })
  @ApiResponse({ status: 404, description: '项目未找到' })
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto, @Req() req) {
    return this.projectService.update(id, updateProjectDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除项目' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '项目未找到' })
  remove(@Param('id') id: string, @Req() req) {
    return this.projectService.remove(id, req.user.id);
  }

  @Post('upload-icon')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file')) // 'file' is the field name in FormData
  async uploadIcon(@UploadedFile() file: Express.Multer.File) {
    return this.projectService.uploadIcon(file);
  }
}
