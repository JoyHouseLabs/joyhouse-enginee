import { Injectable } from '@nestjs/common'
import { Blip2Extractor } from './extractors/blip2.extractor'
import { Storage } from '../storage/storage.entity'
import { ExtractionResult } from '../types'

@Injectable()
export class MultimodalService {
  constructor(private readonly blip2: Blip2Extractor) {}

  async extract(file: Storage, type: 'blip2' | 'ocr' | 'clip' = 'blip2'): Promise<ExtractionResult[]> {
    if (type === 'blip2') {
      return this.blip2.extract(file)
    }
    throw new Error('暂不支持该类型')
  }
} 