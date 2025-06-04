export interface ExtractionResult {
  contentType: string
  content: string
  metadata?: Record<string, any>
  pageNumber?: number
  section?: string
  rawContent?: string
  language?: string
  confidence?: number
} 