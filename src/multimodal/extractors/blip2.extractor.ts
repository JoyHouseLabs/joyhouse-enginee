import { Injectable } from '@nestjs/common'
import axios from 'axios'
import { Storage } from '../../storage/storage.entity'
import { ExtractionResult } from '../types'
import * as fs from 'fs'

@Injectable()
export class Blip2Extractor {
  async extract(file: Storage): Promise<ExtractionResult[]> {
    // 读取图片为 base64
    let imageBase64 = ''
    if (file.filepath && fs.existsSync(file.filepath)) {
      imageBase64 = fs.readFileSync(file.filepath, { encoding: 'base64' })
    } else if (file.url) {
      // 若无本地文件，尝试远程拉取
      const resp = await axios.get(file.url, { responseType: 'arraybuffer' })
      imageBase64 = Buffer.from(resp.data, 'binary').toString('base64')
    } else {
      throw new Error('图片文件不存在')
    }

    // 调用 OpenRouter 多模态接口
    const apiKey = process.env.BLIP2_OPENROUTER_API_KEY
    if (!apiKey) {
      throw new Error('BLIP2_OPENROUTER_API_KEY environment variable is not set.')
    }
    const model = process.env.BLIP2_OPENROUTER_MODEL
    if (!model) {
      throw new Error('BLIP2_OPENROUTER_MODEL environment variable is not set.')
    }
    const prompt = process.env.BLIP2_OPENROUTER_PROMPT
    if (!prompt) {
      throw new Error('BLIP2_OPENROUTER_PROMPT environment variable is not set.')
    }
    const httpReferer = process.env.BLIP2_OPENROUTER_HTTP_REFERER || 'your-app.com'
    const xTitle = process.env.BLIP2_OPENROUTER_X_TITLE || 'Image Caption Demo'
    const lang = process.env.BLIP2_LANG || 'en'

    const payload = {
      model: model, // 可选其它多模态模型
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
    }
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': httpReferer, // 可选
      'X-Title': xTitle, // 可选
    }
    const resp = await axios.post('https://openrouter.ai/api/v1/chat/completions', payload, { headers })
    const caption = resp.data.choices?.[0]?.message?.content || ''
    return [{
      contentType: 'caption',
      content: caption,
      metadata: {},
      pageNumber: 1,
      section: '',
      rawContent: caption,
      language: lang,
      confidence: 1,
    }]
  }
} 