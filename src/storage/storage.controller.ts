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
  Res,
  Query,
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
import * as crypto from 'crypto';
import { Request, Response } from 'express';

import { CreateStorageDirDto } from './storage-dir.dto';
import { StorageDir } from './storage-dir.entity';

import { UseGuards } from '@nestjs/common';
import { RoleGuard } from '../role/role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('存储')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('dir/rename')
  @ApiResponse({ status: 200, description: '目录重命名成功' })
  async renameDir(@Body() body: { id: string; name: string }): Promise<void> {
    return this.storageService.renameDir(body.id, body.name);
  }



  // @Post('dir/delete')
  // @ApiResponse({ status: 200, description: '目录删除成功' })
  // async deleteDir(@Body() body: { id: string }): Promise<void> {
  //   return this.storageService.deleteDir(body.id);
  // }

  // @Post('file/upload')
  // @ApiResponse({ status: 200, description: '文件上传成功' })
  // @UseInterceptors(FileInterceptor('file'))
  // async uploadFile(
  //   @UploadedFile() file: Express.Multer.File,
  //   @Body() body: { parentId: string }
  // ): Promise<void> {
  //   return this.storageService.uploadFile(file, body.parentId);
  // }

  // @Post('file/rename')
  // @ApiResponse({ status: 200, description: '文件重命名成功' })
  // async renameFile(@Body() body: { id: string; name: string }): Promise<void> {
  //   return this.storageService.renameFile(body.id, body.name);
  // }

  // @Post('file/delete')
  // @ApiResponse({ status: 200, description: '文件删除成功' })
  // async deleteFile(@Body() body: { id: string }): Promise<void> {
  //   return this.storageService.deleteFile(body.id);
  // }

  // @Post('file/move')
  // @ApiResponse({ status: 200, description: '文件移动成功' })
  // async moveFile(@Body() body: { id: string; targetDirId: string }): Promise<void> {
  //   return this.storageService.moveFile(body.id, body.targetDirId);
  // }

  // @Get('dir/list')
  // @ApiResponse({ status: 200, description: '获取目录列表成功' })
  // async listDir(@Query('id') id: string): Promise<any> {
  //   return this.storageService.listDir(id);
  // }

  // @Get('file/list')
  // @ApiResponse({ status: 200, description: '获取文件列表成功' })
  // async listFiles(@Query('dirId') dirId: string): Promise<any> {
  //   return this.storageService.listFiles(dirId);
  // }

  // @Get('file/download')
  // @ApiResponse({ status: 200, description: '文件下载成功' })
  // async downloadFile(@Query('id') id: string, @Res() res: Response): Promise<void> {
  //   return this.storageService.downloadFile(id, res);
  // }

  // @Get('file/preview')
  // @ApiResponse({ status: 200, description: '文件预览成功' })
  // async previewFile(@Query('id') id: string, @Res() res: Response): Promise<void> {
  //   return this.storageService.previewFile(id, res);
  // }

  // @Get('file/info')
  // @ApiResponse({ status: 200, description: '获取文件信息成功' })
  // async getFileInfo(@Query('id') id: string): Promise<any> {
  //   return this.storageService.getFileInfo(id);
  // }

  // @Post('file/share')
  // @ApiResponse({ status: 200, description: '文件分享成功' })
  // async shareFile(@Body() body: { id: string; expireTime?: number }): Promise<any> {
  //   return this.storageService.shareFile(body.id, body.expireTime);
  // }

  // @Get('file/shared')
  // @ApiResponse({ status: 200, description: '获取分享文件成功' })
  // async getSharedFile(@Query('shareId') shareId: string, @Res() res: Response): Promise<void> {
  //   return this.storageService.getSharedFile(shareId, res);
  // }

  // @Post('file/copy')
  // @ApiResponse({ status: 200, description: '文件复制成功' })
  // async copyFile(@Body() body: { id: string; targetDirId: string }): Promise<void> {
  //   return this.storageService.copyFile(body.id, body.targetDirId);
  // }

  // @Post('file/restore')
  // @ApiResponse({ status: 200, description: '文件恢复成功' })
  // async restoreFile(@Body() body: { id: string }): Promise<void> {
  //   return this.storageService.restoreFile(body.id);
  // }

  // @Get('file/trash')
  // @ApiResponse({ status: 200, description: '获取回收站文件列表成功' })
  // async getTrashFiles(): Promise<any> {
  //   return this.storageService.getTrashFiles();
  // }

  // @Post('file/empty-trash')
  // @ApiResponse({ status: 200, description: '清空回收站成功' })
  // async emptyTrash(): Promise<void> {
  //   return this.storageService.emptyTrash();
  // }

  @Post('dir/contents')
  @ApiResponse({ status: 200, description: '获取目录下所有目录和文件' })
  async getDirContents(@Body() body: { id: string }, @Req() req) {
    if (!body.id) {
      throw new Error('目录ID不能为空');
    }
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('用户未登录');
    }
    return this.storageService.findDirContents(body.id, userId);
  }

  @Post('user/directories')
  @ApiResponse({ status: 200, description: '获取用户的home和share目录' })
  async getUserDirectories(@Req() req) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('用户未登录');
    }
    return this.storageService.findUserDirectories(userId);
  }

  @Post('file/remove')
  @ApiResponse({ status: 204, description: '删除文件' })
  async removeFile(@Body() body: { id: string }): Promise<void> {
    return this.storageService.removeFile(body.id);
  }

  @Post('dir/remove')
  @ApiResponse({ status: 204, description: '删除目录及其所有内容' })
  async removeDir(@Body() body: { id: string }): Promise<void> {
    return this.storageService.removeDir(body.id);
  }

  @Post('upload')
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
    const config = JoyhouseConfigService.loadConfig();
    const uploadDir = config.uploadDir;
    const fileDomain = config.fileDomain;

    // 保证上传目录存在
    fs.mkdirSync(uploadDir, { recursive: true });

    // 处理文件名：生成随机字符串 + 原始扩展名
    const ext = extname(file.originalname);
    const randomStr = crypto.randomBytes(8).toString('hex');
    const filenameOnDisk = `${Date.now()}-${randomStr}${ext}`;
    const filepath = `${uploadDir}/${filenameOnDisk}`;

    // 保存文件
    fs.writeFileSync(filepath, file.buffer);

    // 生成访问URL：使用fileDomain + /uploads/ + filename
    const url = `${fileDomain}/uploads/${filenameOnDisk}`;

    let storage_dir_id = req.body?.storage_dir_id || undefined;
    if (!storage_dir_id || storage_dir_id == 'home') storage_dir_id = 'publicfiles';

    // 数据库filename字段记录原始文件名（转码防乱码）
    const entity = await this.storageService.saveFile({
      filename: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      filepath,
      filetype: file.mimetype,
      filesize: file.size,
      url,
      userId: req.user?.id || '',
      storage_dir_id,
    });

    return {
      url: entity.url,
      filepath: entity.filepath,
      filesize: entity.filesize,
      filetype: entity.filetype,
      filename: entity.filename,
      userId: entity.userId,
      storage_dir_id: entity.storage_dir_id,
    };
  }

  @Post('createDir')
  @ApiResponse({ status: 201, type: StorageDir, description: '目录创建成功' })
  async createDir(
    @Body() dto: CreateStorageDirDto,
    @Req() req,
  ): Promise<StorageDir> {
    // parent 字段默认为空字符串
    if (!dto.parent || dto.parent == 'home') dto.parent = '';
    dto.userId = req.user?.id; // 使用统一的用户ID字段
    return this.storageService.createDir(dto);
  }

  @Post('search')
  @ApiResponse({ status: 200, description: '搜索文件和目录' })
  async search(@Body() body: { keyword: string }, @Req() req) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('用户未登录');
    }
    return this.storageService.search(userId, body.keyword);
  }

  @Post('share')
  @ApiResponse({ status: 200, description: '分享文件或目录' })
  async share(
    @Body() body: { id: string; type: 'file' | 'dir'; userIds: string[]; permissions: 'read' | 'write' | 'admin' },
  ) {
    return this.storageService.share(body.id, body.type, body.userIds, body.permissions);
  }

  @Get('file/versions/:id')
  @ApiResponse({ status: 200, description: '获取文件版本历史' })
  async getFileVersions(@Param('id') id: string) {
    return this.storageService.getFileVersions(id);
  }

  // @Post('import/url')
  // @ApiResponse({ status: 201, type: StorageUploadResponseDto, description: '从URL导入文件成功' })
  // async importFromUrl(
  //   @Body() body: { url: string; storage_dir_id?: string },
  //   @Req() req,
  // ): Promise<StorageUploadResponseDto> {
  //   const userId = req.user?.id;
  //   if (!userId) {
  //     throw new Error('用户未登录');
  //   }
  //   const storage_dir_id = body.storage_dir_id || 'publicfiles';
  //   const entity = await this.storageService.importFromUrl(body.url, storage_dir_id, userId);
  //   return {
  //     url: entity.url,
  //     filepath: entity.filepath,
  //     filesize: entity.filesize,
  //     filetype: entity.filetype,
  //     filename: entity.filename,
  //     userId: entity.userId,
  //     storage_dir_id: entity.storage_dir_id,
  //   };
  // }

  // @Post('import/webpage')
  // @ApiResponse({ status: 201, type: StorageUploadResponseDto, description: '从网页导入内容成功' })
  // async importFromWebpage(
  //   @Body() body: { url: string; storage_dir_id?: string },
  //   @Req() req,
  // ): Promise<StorageUploadResponseDto> {
  //   const userId = req.user?.id;
  //   if (!userId) {
  //     throw new Error('用户未登录');
  //   }
  //   const storage_dir_id = body.storage_dir_id || 'publicfiles';
  //   const entity = await this.storageService.importFromWebpage(body.url, storage_dir_id, userId);
  //   return {
  //     url: entity.url,
  //     filepath: entity.filepath,
  //     filesize: entity.filesize,
  //     filetype: entity.filetype,
  //     filename: entity.filename,
  //     userId: entity.userId,
  //     storage_dir_id: entity.storage_dir_id,
  //   };
  // }

  // @Post('import/api')
  // @ApiResponse({ status: 201, type: StorageUploadResponseDto, description: '从API导入数据成功' })
  // async importFromApi(
  //   @Body() body: {
  //     url: string;
  //     method?: 'GET' | 'POST';
  //     headers?: Record<string, string>;
  //     body?: any;
  //     storage_dir_id?: string;
  //   },
  //   @Req() req,
  // ): Promise<StorageUploadResponseDto> {
  //   const userId = req.user?.id;
  //   if (!userId) {
  //     throw new Error('用户未登录');
  //   }
  //   const storage_dir_id = body.storage_dir_id || 'publicfiles';
  //   const entity = await this.storageService.importFromApi(
  //     body.url,
  //     body.method,
  //     body.headers,
  //     body.body,
  //     storage_dir_id,
  //     userId,
  //   );
  //   return {
  //     url: entity.url,
  //     filepath: entity.filepath,
  //     filesize: entity.filesize,
  //     filetype: entity.filetype,
  //     filename: entity.filename,
  //     userId: entity.userId,
  //     storage_dir_id: entity.storage_dir_id,
  //   };
  // }

  @Get('dir/:id')
  @ApiResponse({ status: 200, description: '获取目录下所有目录和文件' })
  async getDirContentsById(@Param('id') id: string, @Req() req) {
    if (!id) {
      throw new Error('目录ID不能为空');
    }
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('用户未登录');
    }
    return this.storageService.findDirContents(id, userId);
  }

  // 获取目录树
  @Get('dir/tree')
  async getDirTree(@Req() req: Request) {
    const userId = (req.user as any).id
    const dirs = await this.storageService.getDirTree(userId)
    return dirs as (StorageDir & { children: StorageDir[] })[]
  }

  // 获取目录面包屑
  @Get('dir/breadcrumbs/:id')
  async getDirBreadcrumbs(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).id
    const breadcrumbs = await this.storageService.getDirBreadcrumbs(id, userId)
    return breadcrumbs
  }

  @Post('file/extract-content')
  @ApiResponse({ status: 200, description: '提取文件内容成功' })
  async extractContent(@Body() body: { fileId: string }, @Req() req) {
    const userId = req.user?.id;
    return this.storageService.extractContent(body.fileId, userId);
  }
}
