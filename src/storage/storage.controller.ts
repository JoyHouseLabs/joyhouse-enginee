import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Req,
  Body,
  Get,
  Delete,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { StorageUploadResponseDto } from './storage.dto';
import * as fs from 'fs';
import { JoyhouseConfigService } from '../common/joyhouse-config';
import { extname } from 'path';

import { CreateStorageDirDto } from './storage-dir.dto';
import { StorageDir } from './storage-dir.entity';

import { UseGuards } from '@nestjs/common';
import { RoleGuard } from '../role/role.guard';
import { JwtAuthGuard } from '../user/jwt-auth.guard';

@ApiTags('存储')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiBearerAuth()
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('dir/rename')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: '目录重命名成功' })
  async renameDir(@Body() body: { id: string; name: string }): Promise<void> {
    return this.storageService.renameDir(body.id, body.name);
  }

  @Post('file/rename')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: '文件重命名成功' })
  async renameFile(@Body() body: { id: string; name: string }): Promise<void> {
    return this.storageService.renameFile(body.id, body.name);
  }

  @Post('dir/contents')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: '获取目录下所有目录和文件' })
  async getDirContents(@Body() body: { id: string }) {
    if (!body.id) {
      throw new Error('目录ID不能为空');
    }
    return this.storageService.findDirContents(body.id);
  }

  @Post('user/directories')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: '获取用户的home和share目录' })
  async getUserDirectories(@Req() req) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new Error('用户未登录');
    }
    return this.storageService.findUserDirectories(userId);
  }

  @Post('file/remove')
  @ApiBearerAuth()
  @ApiResponse({ status: 204, description: '删除文件' })
  async removeFile(@Body() body: { id: string }): Promise<void> {
    return this.storageService.removeFile(body.id);
  }

  @Post('dir/remove')
  @ApiBearerAuth()
  @ApiResponse({ status: 204, description: '删除目录及其所有内容' })
  async removeDir(@Body() body: { id: string }): Promise<void> {
    return this.storageService.removeDir(body.id);
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        storage_dir_id: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    type: StorageUploadResponseDto,
    description: '上传成功',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ): Promise<StorageUploadResponseDto> {
    // 统一用 JoyhouseConfigService 获取配置
    const uploadDir = JoyhouseConfigService.loadConfig().uploadDir;
    const domain = JoyhouseConfigService.loadConfig().fileDomain;
    // 保证上传目录存在
    fs.mkdirSync(uploadDir, { recursive: true });
    const filename = Date.now() + '-' + file.originalname;
    const filepath = `${uploadDir}/${filename}`;
    fs.writeFileSync(filepath, file.buffer);
    const url = `${domain}/${filepath}`.replace(/\\/g, '/');
    let storage_dir_id = req.body?.storage_dir_id || undefined;
    if (!storage_dir_id || storage_dir_id == 'home') storage_dir_id = '';

    const entity = await this.storageService.saveFile({
      filename,
      filepath,
      filetype: file.mimetype,
      filesize: file.size,
      url,
      user_id: req.user?.sub || '',
      storage_dir_id,
    });
    return {
      url: entity.url,
      filepath: entity.filepath,
      filesize: entity.filesize,
      filetype: entity.filetype,
      filename: entity.filename,
      user_id: entity.user_id,
      storage_dir_id: entity.storage_dir_id,
    };
  }

  @Post('createDir')
  @ApiBearerAuth()
  @ApiResponse({ status: 201, type: StorageDir, description: '目录创建成功' })
  async createDir(
    @Body() dto: CreateStorageDirDto,
    @Req() req,
  ): Promise<StorageDir> {
    // parent 字段默认为空字符串
    if (!dto.parent || dto.parent == 'home') dto.parent = '';
    dto.user_id = req.user.sub; // 自动注入当前登录用户id
    return this.storageService.createDir(dto);
  }
}
