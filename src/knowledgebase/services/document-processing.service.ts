import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeChunk } from '../entities/knowledge-chunk.entity';
import { Knowledgefile } from '../knowledgefile.entity';
import { Knowledgebase } from '../knowledgebase.entity';
import * as fs from 'fs';
import * as path from 'path';

export interface ProcessingConfig {
  chunkSize: number;
  chunkOverlap: number;
  embeddingModel: string;
  enableCodeParsing: boolean;
  enableStructureExtraction: boolean;
}

export interface ChunkData {
  content: string;
  title?: string;
  metadata?: any;
  keywords?: string[];
}

export interface ProcessingResult {
  totalChunks: number;
  processingTime: number;
  extractedMetadata: any;
  errors?: string[];
}

@Injectable()
export class DocumentProcessingService {
  private readonly logger = new Logger(DocumentProcessingService.name);

  constructor(
    @InjectRepository(KnowledgeChunk)
    private readonly chunkRepo: Repository<KnowledgeChunk>,
    @InjectRepository(Knowledgefile)
    private readonly fileRepo: Repository<Knowledgefile>,
    @InjectRepository(Knowledgebase)
    private readonly kbRepo: Repository<Knowledgebase>,
  ) {}

  /**
   * 处理单个文档
   */
  async processDocument(fileId: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      const file = await this.fileRepo.findOne({
        where: { id: fileId },
      });

      if (!file) {
        throw new Error(`File with ID ${fileId} not found`);
      }

      this.logger.log(`Starting to process document: ${file.filename}`);

      // 更新文件状态为处理中
      await this.updateFileStatus(fileId, 'processing');

      // 1. 提取文档内容
      const content = await this.extractContent(file);
      this.logger.log(`Extracted content from ${file.filename}, length: ${content.length}`);

      // 2. 获取处理配置
      const config = await this.getProcessingConfig(file.knowledgebaseId);

      // 3. 文档分块
      const chunks = await this.chunkDocument(content, file, config);
      this.logger.log(`Created ${chunks.length} chunks from ${file.filename}`);

      // 4. 保存知识块
      await this.saveChunks(chunks, file);

      // 5. 更新文件状态和处理结果
      const processingResult: ProcessingResult = {
        totalChunks: chunks.length,
        processingTime: Date.now() - startTime,
        extractedMetadata: this.extractMetadata(content, file),
      };

      await this.updateFileStatus(fileId, 'completed', processingResult);

      this.logger.log(`Successfully processed file ${file.filename} with ${chunks.length} chunks in ${processingResult.processingTime}ms`);
    } catch (error) {
      this.logger.error(`Error processing file ${fileId}:`, error);
      await this.updateFileStatus(fileId, 'error', undefined, error.message);
      throw error;
    }
  }

  /**
   * 批量处理文件
   */
  async batchProcessFiles(fileIds: string[]): Promise<void> {
    this.logger.log(`Starting batch processing of ${fileIds.length} files`);
    
    for (const fileId of fileIds) {
      try {
        await this.processDocument(fileId);
      } catch (error) {
        this.logger.error(`Failed to process file ${fileId}:`, error);
        // 继续处理其他文件
      }
    }
    
    this.logger.log(`Completed batch processing of ${fileIds.length} files`);
  }

  /**
   * 重新处理知识库中的所有文档
   */
  async reprocessKnowledgebase(knowledgebaseId: string): Promise<void> {
    this.logger.log(`Starting reprocessing of knowledgebase: ${knowledgebaseId}`);
    
    // 删除现有的知识块
    await this.chunkRepo.delete({ knowledgebaseId });
    this.logger.log(`Deleted existing chunks for knowledgebase: ${knowledgebaseId}`);

    // 获取所有文件
    const files = await this.fileRepo.find({
      where: { knowledgebaseId },
    });

    this.logger.log(`Found ${files.length} files to reprocess`);

    // 重新处理所有文件
    for (const file of files) {
      await this.processDocument(file.id);
    }
    
    this.logger.log(`Completed reprocessing of knowledgebase: ${knowledgebaseId}`);
  }

  /**
   * 提取文档内容
   */
  private async extractContent(file: Knowledgefile): Promise<string> {
    const filePath = file.filepath;

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileExtension = path.extname(file.filename).toLowerCase();
    this.logger.debug(`Extracting content from ${fileExtension} file: ${file.filename}`);

    switch (fileExtension) {
      case '.txt':
      case '.md':
      case '.markdown':
        return fs.readFileSync(filePath, 'utf-8');
      case '.pdf':
        return this.extractPdfContent(filePath);
      case '.docx':
        return this.extractDocxContent(filePath);
      case '.html':
      case '.htm':
        return this.extractHtmlContent(filePath);
      case '.rs':
      case '.js':
      case '.ts':
      case '.py':
      case '.java':
      case '.cpp':
      case '.c':
      case '.go':
      case '.php':
        return this.extractCodeContent(filePath);
      case '.json':
        return this.extractJsonContent(filePath);
      case '.xml':
        return this.extractXmlContent(filePath);
      default:
        // 尝试作为文本文件读取
        this.logger.warn(`Unknown file extension ${fileExtension}, treating as text file`);
        return fs.readFileSync(filePath, 'utf-8');
    }
  }

  /**
   * 提取 PDF 内容
   */
  private async extractPdfContent(filePath: string): Promise<string> {
    // TODO: 实现 PDF 内容提取
    // 可以使用 pdf-parse 或其他 PDF 解析库
    this.logger.warn('PDF extraction not implemented yet, returning empty string');
    return '';
  }

  /**
   * 提取 DOCX 内容
   */
  private async extractDocxContent(filePath: string): Promise<string> {
    // TODO: 实现 DOCX 内容提取
    // 可以使用 mammoth 或其他 DOCX 解析库
    this.logger.warn('DOCX extraction not implemented yet, returning empty string');
    return '';
  }

  /**
   * 提取 HTML 内容
   */
  private async extractHtmlContent(filePath: string): Promise<string> {
    const content = fs.readFileSync(filePath, 'utf-8');
    // 简单的 HTML 标签移除
    return content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // 移除脚本
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // 移除样式
      .replace(/<[^>]*>/g, '') // 移除所有标签
      .replace(/\s+/g, ' ') // 合并空白字符
      .trim();
  }

  /**
   * 提取代码内容
   */
  private async extractCodeContent(filePath: string): Promise<string> {
    return fs.readFileSync(filePath, 'utf-8');
  }

  /**
   * 提取 JSON 内容
   */
  private async extractJsonContent(filePath: string): Promise<string> {
    const content = fs.readFileSync(filePath, 'utf-8');
    try {
      const jsonData = JSON.parse(content);
      return JSON.stringify(jsonData, null, 2);
    } catch (error) {
      this.logger.warn(`Invalid JSON file: ${filePath}`);
      return content;
    }
  }

  /**
   * 提取 XML 内容
   */
  private async extractXmlContent(filePath: string): Promise<string> {
    const content = fs.readFileSync(filePath, 'utf-8');
    // 简单的 XML 标签移除，保留文本内容
    return content
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * 文档分块
   */
  private async chunkDocument(
    content: string,
    file: Knowledgefile,
    config: ProcessingConfig
  ): Promise<ChunkData[]> {
    const fileExtension = path.extname(file.filename).toLowerCase();

    if (this.isCodeFile(fileExtension) && config.enableCodeParsing) {
      return this.chunkCodeDocument(content, file, config);
    } else {
      return this.chunkTextDocument(content, file, config);
    }
  }

  /**
   * 文本文档分块
   */
  private async chunkTextDocument(
    content: string,
    file: Knowledgefile,
    config: ProcessingConfig
  ): Promise<ChunkData[]> {
    const chunks: ChunkData[] = [];
    const { chunkSize, chunkOverlap } = config;

    // 按段落分割
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    let currentChunk = '';
    let currentSize = 0;

    for (const paragraph of paragraphs) {
      const paragraphSize = paragraph.length;

      if (currentSize + paragraphSize > chunkSize && currentChunk.length > 0) {
        // 保存当前块
        chunks.push({
          content: currentChunk.trim(),
          title: this.extractTitle(currentChunk),
          metadata: {
            fileType: path.extname(file.filename),
            chunkIndex: chunks.length,
            startPosition: currentSize - currentChunk.length,
            endPosition: currentSize,
          },
          keywords: this.extractKeywords(currentChunk),
        });

        // 开始新块，保留重叠部分
        const overlapText = this.getOverlapText(currentChunk, chunkOverlap);
        currentChunk = overlapText + '\n' + paragraph;
        currentSize = currentChunk.length;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        currentSize += paragraphSize;
      }
    }

    // 保存最后一个块
    if (currentChunk.trim().length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        title: this.extractTitle(currentChunk),
        metadata: {
          fileType: path.extname(file.filename),
          chunkIndex: chunks.length,
        },
        keywords: this.extractKeywords(currentChunk),
      });
    }

    return chunks;
  }

  /**
   * 代码文档分块
   */
  private async chunkCodeDocument(
    content: string,
    file: Knowledgefile,
    config: ProcessingConfig
  ): Promise<ChunkData[]> {
    const fileExtension = path.extname(file.filename).toLowerCase();

    if (fileExtension === '.rs') {
      return this.chunkRustCode(content, file);
    } else if (['.js', '.ts'].includes(fileExtension)) {
      return this.chunkJavaScriptCode(content, file);
    } else if (fileExtension === '.py') {
      return this.chunkPythonCode(content, file);
    } else {
      // 通用代码分块
      return this.chunkGenericCode(content, file, config);
    }
  }

  /**
   * Rust 代码分块
   */
  private async chunkRustCode(content: string, file: Knowledgefile): Promise<ChunkData[]> {
    const chunks: ChunkData[] = [];
    const lines = content.split('\n');

    let currentFunction = '';
    let currentFunctionName = '';
    let braceCount = 0;
    let inFunction = false;
    let startLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 检测函数定义
      const functionMatch = line.match(/^\s*(pub\s+)?fn\s+(\w+)/);
      if (functionMatch && !inFunction) {
        currentFunctionName = functionMatch[2];
        inFunction = true;
        braceCount = 0;
        startLine = i;
      }

      if (inFunction) {
        currentFunction += line + '\n';

        // 计算大括号
        braceCount += (line.match(/\{/g) || []).length;
        braceCount -= (line.match(/\}/g) || []).length;

        // 函数结束
        if (braceCount === 0 && line.includes('}')) {
          chunks.push({
            content: currentFunction.trim(),
            title: `函数: ${currentFunctionName}`,
            metadata: {
              codeLanguage: 'rust',
              functionName: currentFunctionName,
              startLine: startLine + 1,
              endLine: i + 1,
              importance: this.calculateCodeImportance(currentFunction),
              filePath: file.filename,
            },
            keywords: this.extractCodeKeywords(currentFunction),
          });

          currentFunction = '';
          currentFunctionName = '';
          inFunction = false;
        }
      }
    }

    // 处理结构体和枚举
    const structChunks = this.extractRustStructs(content, file);
    chunks.push(...structChunks);

    return chunks;
  }

  /**
   * 提取 Rust 结构体
   */
  private extractRustStructs(content: string, file: Knowledgefile): ChunkData[] {
    const chunks: ChunkData[] = [];
    const structRegex = /(?:pub\s+)?struct\s+(\w+)[\s\S]*?\{[\s\S]*?\}/g;
    let match;

    while ((match = structRegex.exec(content)) !== null) {
      const structName = match[1];
      const structCode = match[0];

      chunks.push({
        content: structCode,
        title: `结构体: ${structName}`,
        metadata: {
          codeLanguage: 'rust',
          structName,
          category: 'struct',
          importance: 3,
          filePath: file.filename,
        },
        keywords: this.extractCodeKeywords(structCode),
      });
    }

    return chunks;
  }

  /**
   * JavaScript/TypeScript 代码分块
   */
  private async chunkJavaScriptCode(content: string, file: Knowledgefile): Promise<ChunkData[]> {
    const chunks: ChunkData[] = [];
    const lines = content.split('\n');

    // 简单的函数提取
    const functionRegex = /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\(.*?\)\s*=>))/g;
    let match;

    while ((match = functionRegex.exec(content)) !== null) {
      const functionName = match[1] || match[2];
      const functionCode = this.extractJSFunction(content, match.index);

      if (functionCode) {
        chunks.push({
          content: functionCode,
          title: `函数: ${functionName}`,
          metadata: {
            codeLanguage: file.filename.endsWith('.ts') ? 'typescript' : 'javascript',
            functionName,
            importance: 2,
            filePath: file.filename,
          },
          keywords: this.extractCodeKeywords(functionCode),
        });
      }
    }

    return chunks;
  }

  /**
   * Python 代码分块
   */
  private async chunkPythonCode(content: string, file: Knowledgefile): Promise<ChunkData[]> {
    const chunks: ChunkData[] = [];
    const lines = content.split('\n');

    let currentFunction = '';
    let currentFunctionName = '';
    let inFunction = false;
    let indentLevel = 0;
    let startLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 检测函数定义
      const functionMatch = line.match(/^(\s*)def\s+(\w+)/);
      if (functionMatch) {
        // 保存之前的函数
        if (inFunction && currentFunction) {
          chunks.push({
            content: currentFunction.trim(),
            title: `函数: ${currentFunctionName}`,
            metadata: {
              codeLanguage: 'python',
              functionName: currentFunctionName,
              startLine: startLine + 1,
              endLine: i,
              importance: 2,
              filePath: file.filename,
            },
            keywords: this.extractCodeKeywords(currentFunction),
          });
        }

        currentFunctionName = functionMatch[2];
        indentLevel = functionMatch[1].length;
        inFunction = true;
        currentFunction = line + '\n';
        startLine = i;
      } else if (inFunction) {
        const lineIndent = line.match(/^(\s*)/)?.[1]?.length || 0;
        
        if (line.trim() === '' || lineIndent > indentLevel) {
          currentFunction += line + '\n';
        } else {
          // 函数结束
          chunks.push({
            content: currentFunction.trim(),
            title: `函数: ${currentFunctionName}`,
            metadata: {
              codeLanguage: 'python',
              functionName: currentFunctionName,
              startLine: startLine + 1,
              endLine: i,
              importance: 2,
              filePath: file.filename,
            },
            keywords: this.extractCodeKeywords(currentFunction),
          });

          inFunction = false;
          currentFunction = '';
        }
      }
    }

    // 处理最后一个函数
    if (inFunction && currentFunction) {
      chunks.push({
        content: currentFunction.trim(),
        title: `函数: ${currentFunctionName}`,
        metadata: {
          codeLanguage: 'python',
          functionName: currentFunctionName,
          startLine: startLine + 1,
          endLine: lines.length,
          importance: 2,
          filePath: file.filename,
        },
        keywords: this.extractCodeKeywords(currentFunction),
      });
    }

    return chunks;
  }

  /**
   * 通用代码分块
   */
  private async chunkGenericCode(
    content: string,
    file: Knowledgefile,
    config: ProcessingConfig
  ): Promise<ChunkData[]> {
    const chunks: ChunkData[] = [];
    const lines = content.split('\n');
    const { chunkSize } = config;

    let currentChunk = '';
    let currentSize = 0;
    let chunkIndex = 0;

    for (const line of lines) {
      if (currentSize + line.length > chunkSize && currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.trim(),
          title: `代码块 ${chunkIndex + 1}`,
          metadata: {
            codeLanguage: this.detectCodeLanguage(file.filename),
            chunkIndex,
            filePath: file.filename,
          },
          keywords: this.extractCodeKeywords(currentChunk),
        });

        currentChunk = line + '\n';
        currentSize = line.length;
        chunkIndex++;
      } else {
        currentChunk += line + '\n';
        currentSize += line.length;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        title: `代码块 ${chunkIndex + 1}`,
        metadata: {
          codeLanguage: this.detectCodeLanguage(file.filename),
          chunkIndex,
          filePath: file.filename,
        },
        keywords: this.extractCodeKeywords(currentChunk),
      });
    }

    return chunks;
  }

  /**
   * 保存知识块
   */
  private async saveChunks(chunks: ChunkData[], file: Knowledgefile): Promise<void> {
    for (const chunkData of chunks) {
      const chunk = this.chunkRepo.create({
        knowledgebaseId: file.knowledgebaseId,
        fileId: file.id,
        content: chunkData.content,
        title: chunkData.title,
        metadata: chunkData.metadata,
        keywords: chunkData.keywords,
        relevanceScore: this.calculateRelevanceScore(chunkData),
      });

      await this.chunkRepo.save(chunk);
    }
  }

  /**
   * 更新文件状态
   */
  private async updateFileStatus(
    fileId: string,
    status: string,
    processingResult?: ProcessingResult,
    errorMessage?: string
  ): Promise<void> {
    const updateData: any = { status };

    if (processingResult) {
      updateData.processingResult = processingResult;
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    await this.fileRepo.update(fileId, updateData);
  }

  /**
   * 获取处理配置
   */
  private async getProcessingConfig(knowledgebaseId: string): Promise<ProcessingConfig> {
    const kb = await this.kbRepo.findOne({
      where: { id: knowledgebaseId },
    });

    // 如果知识库有自定义配置，使用自定义配置，否则使用默认配置
    const defaultConfig: ProcessingConfig = {
      chunkSize: 1000,
      chunkOverlap: 200,
      embeddingModel: 'text-embedding-3-small',
      enableCodeParsing: true,
      enableStructureExtraction: true,
    };

    if (kb?.processingConfig) {
      return { ...defaultConfig, ...kb.processingConfig };
    }

    return defaultConfig;
  }

  /**
   * 判断是否为代码文件
   */
  private isCodeFile(extension: string): boolean {
    const codeExtensions = [
      '.rs', '.js', '.ts', '.py', '.java', '.cpp', '.c', '.go', '.php',
      '.rb', '.swift', '.kt', '.scala', '.sh', '.sql', '.css', '.scss',
      '.less', '.vue', '.jsx', '.tsx'
    ];
    return codeExtensions.includes(extension);
  }

  /**
   * 提取标题
   */
  private extractTitle(content: string): string | undefined {
    const lines = content.split('\n');
    const firstLine = lines[0]?.trim();

    // Markdown 标题
    if (firstLine?.startsWith('#')) {
      return firstLine.replace(/^#+\s*/, '');
    }

    // 如果第一行较短且不包含特殊字符，可能是标题
    if (firstLine && firstLine.length < 100 && !firstLine.includes('{')) {
      return firstLine;
    }

    return undefined;
  }

  /**
   * 提取关键词
   */
  private extractKeywords(content: string): string[] {
    // 简单的关键词提取
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && word.length < 20);

    // 统计词频
    const wordCount: Record<string, number> = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    // 返回出现频率最高的词
    return Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * 提取代码关键词
   */
  private extractCodeKeywords(code: string): string[] {
    const keywords: string[] = [];

    // 提取函数名
    const functionMatches = code.match(/(?:function|fn|def|func)\s+(\w+)/g);
    if (functionMatches) {
      keywords.push(...functionMatches.map(match => match.split(/\s+/).pop()!).filter(Boolean));
    }

    // 提取类名
    const classMatches = code.match(/(?:class|struct|interface)\s+(\w+)/g);
    if (classMatches) {
      keywords.push(...classMatches.map(match => match.split(/\s+/).pop()!).filter(Boolean));
    }

    // 提取变量名（简单版本）
    const varMatches = code.match(/(?:let|const|var)\s+(\w+)/g);
    if (varMatches) {
      keywords.push(...varMatches.map(match => match.split(/\s+/).pop()!).filter(Boolean));
    }

    return [...new Set(keywords)];
  }

  /**
   * 检测代码语言
   */
  private detectCodeLanguage(filename: string): string {
    const extension = path.extname(filename).toLowerCase();
    const languageMap: Record<string, string> = {
      '.rs': 'rust',
      '.js': 'javascript',
      '.ts': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.go': 'go',
      '.php': 'php',
      '.rb': 'ruby',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.sh': 'bash',
      '.sql': 'sql',
    };

    return languageMap[extension] || 'unknown';
  }

  /**
   * 计算代码重要性
   */
  private calculateCodeImportance(code: string): number {
    let importance = 1;

    // 公共函数更重要
    if (code.includes('pub fn') || code.includes('public')) {
      importance += 2;
    }

    // 包含注释的函数更重要
    if (code.includes('///') || code.includes('/**') || code.includes('"""')) {
      importance += 1;
    }

    // 长函数可能更重要
    if (code.split('\n').length > 20) {
      importance += 1;
    }

    // 包含错误处理的代码更重要
    if (code.includes('Error') || code.includes('Exception') || code.includes('Result')) {
      importance += 1;
    }

    return Math.min(importance, 5);
  }

  /**
   * 计算相关性评分
   */
  private calculateRelevanceScore(chunkData: ChunkData): number {
    let score = 1.0;

    // 有标题的块更重要
    if (chunkData.title) {
      score += 0.5;
    }

    // 代码块的重要性
    if (chunkData.metadata?.importance) {
      score += chunkData.metadata.importance * 0.2;
    }

    // 内容长度影响
    const contentLength = chunkData.content.length;
    if (contentLength > 500) {
      score += 0.3;
    }

    // 关键词数量影响
    if (chunkData.keywords && chunkData.keywords.length > 5) {
      score += 0.2;
    }

    return Math.min(score, 5.0);
  }

  /**
   * 获取重叠文本
   */
  private getOverlapText(text: string, overlapSize: number): string {
    if (text.length <= overlapSize) {
      return text;
    }

    return text.slice(-overlapSize);
  }

  /**
   * 提取元数据
   */
  private extractMetadata(content: string, file: Knowledgefile): any {
    return {
      wordCount: content.split(/\s+/).length,
      lineCount: content.split('\n').length,
      fileSize: file.filesize,
      language: this.detectCodeLanguage(file.filename),
      hasCode: this.isCodeFile(path.extname(file.filename)),
      encoding: 'utf-8',
    };
  }

  /**
   * 提取 JavaScript 函数
   */
  private extractJSFunction(content: string, startIndex: number): string | null {
    const lines = content.split('\n');
    let currentLine = 0;
    let currentPos = 0;

    // 找到起始行
    for (let i = 0; i < lines.length; i++) {
      if (currentPos + lines[i].length >= startIndex) {
        currentLine = i;
        break;
      }
      currentPos += lines[i].length + 1; // +1 for newline
    }

    // 简单的大括号匹配
    let braceCount = 0;
    let functionCode = '';
    let started = false;

    for (let i = currentLine; i < lines.length; i++) {
      const line = lines[i];
      functionCode += line + '\n';

      for (const char of line) {
        if (char === '{') {
          braceCount++;
          started = true;
        } else if (char === '}') {
          braceCount--;
        }
      }

      if (started && braceCount === 0) {
        break;
      }
    }

    return functionCode.trim() || null;
  }
} 