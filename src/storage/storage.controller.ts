import { Controller, Post, UploadedFile, UseInterceptors, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody, ApiResponse } from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { StorageUploadResponseDto } from '../dto/storage.dto';
import * as fs from 'fs';
import { JoyhouseConfigService } from '../common/joyhouse-config';
import { extname } from 'path';

@ApiTags('存储')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiResponse({ status: 201, type: StorageUploadResponseDto, description: '上传成功' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req): Promise<StorageUploadResponseDto> {
    // 统一用 JoyhouseConfigService 获取配置
    const uploadDir = JoyhouseConfigService.loadConfig().uploadDir;
    const domain = JoyhouseConfigService.loadConfig().fileDomain;
    // 保证上传目录存在
    fs.mkdirSync(uploadDir, { recursive: true });
    const filename = Date.now() + '-' + file.originalname;
    const filepath = `${uploadDir}/${filename}`;
    fs.writeFileSync(filepath, file.buffer);
    const url = `${domain}/${filepath}`.replace(/\\/g, '/');
    const entity = await this.storageService.saveFile({
      filename,
      filepath,
      filetype: file.mimetype,
      filesize: file.size,
      url,
      user_id: req.user?.sub || '',
    });
    return {
      url: entity.url,
      filepath: entity.filepath,
      filesize: entity.filesize,
      filetype: entity.filetype,
      filename: entity.filename,
      user_id: entity.user_id,
    };
  }
}
