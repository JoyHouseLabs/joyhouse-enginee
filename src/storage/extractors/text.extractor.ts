import { Injectable } from '@nestjs/common'
import { BaseExtractor, ExtractionResult, ExtractionOptions } from './base.extractor'
import { ContentType } from '../file-content.entity'
import * as fs from 'fs'

@Injectable()
export class TextExtractor extends BaseExtractor {
  supportedMimeTypes = [
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/csv'
  ]
  
  supportedExtensions = ['.txt', '.md', '.csv', '.log', '.json']
  
  async extract(filePath: string, options?: ExtractionOptions): Promise<ExtractionResult[]> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const cleanedContent = this.cleanText(content)
      const language = this.detectLanguage(cleanedContent)
      
      const results: ExtractionResult[] = []
      
      // 主要文本内容
      results.push({
        contentType: ContentType.TEXT,
        content: cleanedContent,
        rawContent: content,
        language,
        confidence: 0.95,
        metadata: {
          encoding: 'utf-8',
          lineCount: content.split('\n').length,
          charCount: content.length,
          keywords: this.extractKeywords(cleanedContent)
        }
      })
      
      // 如果是CSV文件，额外提取表格结构
      if (filePath.toLowerCase().endsWith('.csv')) {
        const tableData = this.parseCSV(content)
        if (tableData.rows.length > 0) {
          results.push({
            contentType: ContentType.TABLE,
            content: `表格数据：${tableData.headers.join(', ')}`,
            metadata: tableData,
            confidence: 0.9
          })
        }
      }
      
      // 如果是JSON文件，提取结构化信息
      if (filePath.toLowerCase().endsWith('.json')) {
        try {
          const jsonData = JSON.parse(content)
          results.push({
            contentType: ContentType.METADATA,
            content: `JSON结构数据`,
            metadata: {
              type: 'json',
              structure: this.analyzeJSONStructure(jsonData),
              keys: Object.keys(jsonData).slice(0, 20) // 限制前20个key
            },
            confidence: 0.95
          })
        } catch (e) {
          // JSON解析失败，当作普通文本处理
        }
      }
      
      return results
    } catch (error) {
      throw new Error(`文本提取失败: ${error.message}`)
    }
  }
  
  private parseCSV(content: string) {
    const lines = content.split('\n').filter(line => line.trim())
    if (lines.length === 0) return { headers: [], rows: [] }
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const rows = lines.slice(1).map(line => 
      line.split(',').map(cell => cell.trim().replace(/"/g, ''))
    )
    
    return { headers, rows }
  }
  
  private analyzeJSONStructure(obj: any, maxDepth = 3): any {
    if (maxDepth <= 0) return typeof obj
    
    if (Array.isArray(obj)) {
      return {
        type: 'array',
        length: obj.length,
        itemType: obj.length > 0 ? this.analyzeJSONStructure(obj[0], maxDepth - 1) : 'unknown'
      }
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const structure: any = { type: 'object', properties: {} }
      Object.keys(obj).slice(0, 10).forEach(key => {
        structure.properties[key] = this.analyzeJSONStructure(obj[key], maxDepth - 1)
      })
      return structure
    }
    
    return typeof obj
  }
} 