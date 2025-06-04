import { Controller, Post, Body, Req } from '@nestjs/common'
import { MultimodalService } from './multimodal.service'
import { StorageService } from '../storage/storage.service'

@Controller('multimodal')
export class MultimodalController {
  constructor(
    private readonly multimodal: MultimodalService,
    private readonly storageService: StorageService,
  ) {}

  @Post('extract')
  async extract(@Body() body: { fileId: string, type?: string }, @Req() req) {
    const file = await this.storageService.findFileById(body.fileId)
    const type = body.type as 'blip2' | 'ocr' | 'clip' | undefined
    return this.multimodal.extract(file, type)
  }
} 