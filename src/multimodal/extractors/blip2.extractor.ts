import { Injectable } from '@nestjs/common'
import axios from 'axios'
import { Storage } from '../../storage/storage.entity'
import { ExtractionResult } from '../types'

@Injectable()
export class Blip2Extractor {
  async extract(file: Storage): Promise<ExtractionResult[]> {
    // 假设 file.url 是图片可访问地址
    const resp = await axios.post('http://localhost:5000/blip2/caption', { url: file.url })
    return [{
      contentType: 'caption',
      content: resp.data.caption,
      metadata: {},
      pageNumber: 1,
      section: '',
      rawContent: resp.data.caption,
      language: 'auto',
      confidence: 1,
    }]
  }
} 