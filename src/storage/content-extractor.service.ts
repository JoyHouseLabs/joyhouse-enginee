import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Storage } from './storage.entity'
import { FileContent, ContentType } from './file-content.entity'
import { TextExtractor } from './extractors/text.extractor'
import { BaseExtractor, ExtractionResult } from './extractors/base.extractor'
import * as path from 'path'

@Injectable()
export class ContentExtractorService {
  private extractors: BaseExtractor[]

  constructor(
    @InjectRepository(FileContent)
    private readonly fileContentRepo: Repository<FileContent>,
    private readonly textExtractor: TextExtractor,
  ) {
    // 后续可扩展更多类型的提取器
    this.extractors = [textExtractor]
  }

  // 主入口：提取并保存内容
  async extractAndSave(file: Storage): Promise<FileContent[]> {
    const ext = path.extname(file.filename).toLowerCase()
    const mime = file.filetype
    const extractor = this.extractors.find(e => e.supports(mime, ext))
    if (!extractor) throw new Error('暂不支持该文件类型的内容提取')

    const results = await extractor.extract(file.filepath)
    const entities: FileContent[] = []
    for (const result of results) {
      const entity = this.fileContentRepo.create({
        fileId: file.id,
        contentType: result.contentType,
        content: result.content,
        metadata: result.metadata,
        pageNumber: result.pageNumber,
        section: result.section,
        rawContent: result.rawContent,
        extractionConfig: {},
        isProcessed: false,
        summary: '',
        keywords: result.metadata?.keywords || [],
        language: result.language,
        confidence: result.confidence,
      })
      await this.fileContentRepo.save(entity)
      entities.push(entity)
    }
    return entities
  }
} 