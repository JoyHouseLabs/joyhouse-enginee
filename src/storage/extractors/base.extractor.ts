import { FileContent, ContentType } from '../file-content.entity'

export interface ExtractionResult {
  contentType: ContentType
  content: string
  metadata?: any
  pageNumber?: number
  section?: string
  rawContent?: string
  confidence?: number
  language?: string
}

export interface ExtractionOptions {
  extractImages?: boolean
  extractTables?: boolean
  maxTextLength?: number
  language?: string
  preserveFormatting?: boolean
}

export abstract class BaseExtractor {
  abstract supportedMimeTypes: string[]
  abstract supportedExtensions: string[]
  
  abstract extract(filePath: string, options?: ExtractionOptions): Promise<ExtractionResult[]>
  
  // 检查是否支持该文件类型
  supports(mimeType: string, extension: string): boolean {
    return this.supportedMimeTypes.includes(mimeType) || 
           this.supportedExtensions.includes(extension.toLowerCase())
  }
  
  // 清洗文本内容
  protected cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // 多个空白字符替换为单个空格
      .replace(/\n\s*\n/g, '\n') // 多个换行替换为单个换行
      .trim()
  }
  
  // 检测语言（简单实现）
  protected detectLanguage(text: string): string {
    const chineseRegex = /[\u4e00-\u9fff]/g
    const chineseCount = (text.match(chineseRegex) || []).length
    const totalChars = text.length
    
    if (chineseCount / totalChars > 0.3) {
      return 'zh'
    }
    return 'en'
  }
  
  // 提取关键词（简单实现）
  protected extractKeywords(text: string): string[] {
    // 这里可以集成更复杂的关键词提取算法
    const words = text.toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
    
    const wordCount = new Map<string, number>()
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1)
    })
    
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word)
  }
} 