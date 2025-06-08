import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeChunk } from '../entities/knowledge-chunk.entity';
import { Storage } from '../../storage/storage.entity';
import { Knowledgebase } from '../knowledgebase.entity';
import { FileContent } from '../../storage/file-content.entity';
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
  chunkType?: 'text' | 'code' | 'table' | 'image' | 'metadata' | 'heading' | 'list' | 'quote' | 'equation';
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
    @InjectRepository(Storage)
    private readonly storageRepo: Repository<Storage>,
    @InjectRepository(Knowledgebase)
    private readonly kbRepo: Repository<Knowledgebase>,
    @InjectRepository(FileContent)
    private readonly fileContentRepo: Repository<FileContent>,
  ) {}

  /**
   * 处理单个Storage项目
   */
  async processStorage(storageId: string, knowledgebaseId?: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      const storage = await this.storageRepo.findOne({
        where: { id: storageId },
        relations: ['knowledgeBases'],
      });

      if (!storage) {
        throw new Error(`Storage with ID ${storageId} not found`);
      }

      // 只处理文件类型的Storage
      if (storage.type !== 'file') {
        this.logger.warn(`Storage ${storageId} is not a file, skipping processing`);
        return;
      }

      this.logger.log(`Starting to process storage: ${storage.filename}`);

      // 更新处理状态
      await this.updateStorageProcessingState(storageId, 'processing');

      // 1. 提取文档内容
      const content = await this.extractContent(storage);
      this.logger.log(`Extracted content from ${storage.filename}, length: ${content.length}`);

      // 2. 获取处理配置
      const targetKnowledgeBases = knowledgebaseId ? 
        [await this.kbRepo.findOne({ where: { id: knowledgebaseId } })] :
        storage.knowledgeBases || [];

      if (targetKnowledgeBases.length === 0) {
        this.logger.warn(`No knowledge bases found for storage ${storageId}`);
        return;
      }

      // 3. 为每个知识库处理文档
      for (const kb of targetKnowledgeBases.filter(kb => kb)) {
        await this.processStorageForKnowledgeBase(storage, kb, content, startTime);
      }

      // 4. 更新总体状态
      await this.updateStorageProcessingState(storageId, 'completed');

      this.logger.log(`Successfully processed storage ${storage.filename}`);
    } catch (error) {
      this.logger.error(`Error processing storage ${storageId}:`, error);
      await this.updateStorageProcessingState(storageId, 'failed', error.message);
      throw error;
    }
  }

  /**
   * 为特定知识库处理Storage
   */
  private async processStorageForKnowledgeBase(
    storage: Storage, 
    knowledgeBase: Knowledgebase, 
    content: string,
    startTime: number
  ): Promise<void> {
    // 获取知识库特定的处理配置
    const config = await this.getProcessingConfig(knowledgeBase.id);

    // 文档分块
    const chunks = await this.chunkDocument(content, storage, config);
    this.logger.log(`Created ${chunks.length} chunks from ${storage.filename} for KB ${knowledgeBase.name}`);

    // 保存知识块
    await this.saveChunks(chunks, storage, knowledgeBase.id);

    // 更新知识库统计
    await this.updateKnowledgeBaseStats(knowledgeBase.id, chunks.length);
  }

  /**
   * 批量处理Storage项目
   */
  async batchProcessStorages(storageIds: string[], knowledgebaseId?: string): Promise<void> {
    this.logger.log(`Starting batch processing of ${storageIds.length} storage items`);
    
    for (const storageId of storageIds) {
      try {
        await this.processStorage(storageId, knowledgebaseId);
      } catch (error) {
        this.logger.error(`Failed to process storage ${storageId}:`, error);
        // 继续处理其他项目
      }
    }
    
    this.logger.log(`Completed batch processing of ${storageIds.length} storage items`);
  }

  /**
   * 重新处理知识库中的所有Storage
   */
  async reprocessKnowledgebase(knowledgebaseId: string): Promise<void> {
    this.logger.log(`Starting reprocessing of knowledgebase: ${knowledgebaseId}`);
    
    // 删除现有的知识块
    await this.chunkRepo.delete({ knowledgebaseId });
    this.logger.log(`Deleted existing chunks for knowledgebase: ${knowledgebaseId}`);

    // 获取知识库关联的所有Storage
    const kb = await this.kbRepo.findOne({
      where: { id: knowledgebaseId },
      relations: ['includedFiles'],
    });

    if (!kb) {
      throw new Error(`Knowledge base ${knowledgebaseId} not found`);
    }

    this.logger.log(`Found ${kb.includedFiles.length} storage items to reprocess`);

    // 重新处理所有Storage项目
    for (const storage of kb.includedFiles) {
      await this.processStorage(storage.id, knowledgebaseId);
    }
    
    this.logger.log(`Completed reprocessing of knowledgebase: ${knowledgebaseId}`);
  }

  /**
   * 提取文档内容
   */
  private async extractContent(storage: Storage): Promise<string> {
    // 首先尝试从FileContent获取
    const fileContent = await this.fileContentRepo.findOne({
      where: { fileId: storage.id }
    });
    
    if (fileContent?.content) {
      return fileContent.content;
    }

    // 如果没有预提取的内容，从文件路径读取
    const filePath = storage.filepath;
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileExtension = path.extname(storage.filename).toLowerCase();
    this.logger.debug(`Extracting content from ${fileExtension} file: ${storage.filename}`);

    let content: string;
    switch (fileExtension) {
      case '.txt':
      case '.md':
      case '.markdown':
        content = fs.readFileSync(filePath, 'utf-8');
        break;
      case '.rs':
      case '.js':
      case '.ts':
      case '.py':
      case '.java':
      case '.cpp':
      case '.c':
      case '.go':
      case '.php':
      case '.css':
      case '.scss':
      case '.vue':
      case '.jsx':
      case '.tsx':
        content = fs.readFileSync(filePath, 'utf-8');
        break;
      case '.json':
        content = this.extractJsonContent(filePath);
        break;
      case '.xml':
        content = this.extractXmlContent(filePath);
        break;
      default:
        // 尝试作为文本文件读取
        this.logger.warn(`Unknown file extension ${fileExtension}, treating as text file`);
        content = fs.readFileSync(filePath, 'utf-8');
    }

    // 保存提取的内容到FileContent表
    await this.saveExtractedContent(storage.id, content);

    return content;
  }

  /**
   * 保存提取的内容
   */
  private async saveExtractedContent(storageId: string, content: string): Promise<void> {
    const existingContent = await this.fileContentRepo.findOne({
      where: { fileId: storageId },
    });

    if (existingContent) {
      await this.fileContentRepo.update(existingContent.id, {
        content: content,
        isProcessed: true,
      });
    } else {
      await this.fileContentRepo.save({
        fileId: storageId,
        content: content,
        contentType: 'text' as any,
        isProcessed: true,
      });
    }
  }

  /**
   * 文档分块
   */
  private async chunkDocument(
    content: string,
    storage: Storage,
    config: ProcessingConfig
  ): Promise<ChunkData[]> {
    const fileExtension = path.extname(storage.filename).toLowerCase();
    
    if (this.isCodeFile(fileExtension)) {
      return this.chunkCodeDocument(content, storage, config);
    } else {
      return this.chunkTextDocument(content, storage, config);
    }
  }

  /**
   * 文本文档分块
   */
  private async chunkTextDocument(
    content: string,
    storage: Storage,
    config: ProcessingConfig
  ): Promise<ChunkData[]> {
    const chunks: ChunkData[] = [];
    const { chunkSize, chunkOverlap } = config;

    // 按段落分割
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    let currentChunk = '';
    let overlapText = '';

    for (const paragraph of paragraphs) {
      // 如果当前段落太长，需要进一步分割
      if (paragraph.length > chunkSize) {
        // 先保存当前chunk
        if (currentChunk.trim()) {
          chunks.push(this.createChunkData(currentChunk, storage));
          overlapText = this.getOverlapText(currentChunk, chunkOverlap);
          currentChunk = overlapText;
        }

        // 分割长段落
        const sentences = paragraph.split(/[.!?。！？]\s+/);
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length > chunkSize && currentChunk.trim()) {
            chunks.push(this.createChunkData(currentChunk, storage));
            overlapText = this.getOverlapText(currentChunk, chunkOverlap);
            currentChunk = overlapText + sentence;
          } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
          }
        }
      } else {
        // 检查添加这个段落是否会超过大小限制
        if (currentChunk.length + paragraph.length > chunkSize && currentChunk.trim()) {
          chunks.push(this.createChunkData(currentChunk, storage));
          overlapText = this.getOverlapText(currentChunk, chunkOverlap);
          currentChunk = overlapText + paragraph;
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        }
      }
    }

    // 保存最后一个chunk
    if (currentChunk.trim()) {
      chunks.push(this.createChunkData(currentChunk, storage));
    }

    return chunks;
  }

  /**
   * 代码文档分块
   */
  private async chunkCodeDocument(
    content: string,
    storage: Storage,
    config: ProcessingConfig
  ): Promise<ChunkData[]> {
    const extension = path.extname(storage.filename).toLowerCase();
    
    switch (extension) {
      case '.rs':
        return this.chunkRustCode(content, storage);
      case '.js':
      case '.ts':
      case '.jsx':
      case '.tsx':
        return this.chunkJavaScriptCode(content, storage);
      case '.py':
        return this.chunkPythonCode(content, storage);
      default:
        return this.chunkGenericCode(content, storage, config);
    }
  }

  /**
   * Rust代码分块
   */
  private async chunkRustCode(content: string, storage: Storage): Promise<ChunkData[]> {
    const chunks: ChunkData[] = [];
    const lines = content.split('\n');
    
    let currentFunction = '';
    let currentStruct = '';
    let currentImpl = '';
    let braceLevel = 0;
    let inFunction = false;
    let inStruct = false;
    let inImpl = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // 函数定义
      if (trimmed.match(/^(pub\s+)?fn\s+\w+/)) {
        if (currentFunction.trim()) {
          chunks.push(this.createCodeChunk(currentFunction, storage, 'rust'));
        }
        currentFunction = line + '\n';
        inFunction = true;
        braceLevel = 0;
      }
      // 结构体定义
      else if (trimmed.match(/^(pub\s+)?struct\s+\w+/)) {
        if (currentStruct.trim()) {
          chunks.push(this.createCodeChunk(currentStruct, storage, 'rust'));
        }
        currentStruct = line + '\n';
        inStruct = true;
        braceLevel = 0;
      }
      // impl块
      else if (trimmed.match(/^impl\s+/)) {
        if (currentImpl.trim()) {
          chunks.push(this.createCodeChunk(currentImpl, storage, 'rust'));
        }
        currentImpl = line + '\n';
        inImpl = true;
        braceLevel = 0;
      }
      else {
        if (inFunction) currentFunction += line + '\n';
        if (inStruct) currentStruct += line + '\n';
        if (inImpl) currentImpl += line + '\n';
      }

      // 跟踪大括号层级
      braceLevel += (line.match(/\{/g) || []).length;
      braceLevel -= (line.match(/\}/g) || []).length;

      // 函数/结构体/impl结束
      if (braceLevel === 0 && (inFunction || inStruct || inImpl)) {
        if (inFunction && currentFunction.trim()) {
          chunks.push(this.createCodeChunk(currentFunction, storage, 'rust'));
          currentFunction = '';
        }
        if (inStruct && currentStruct.trim()) {
          chunks.push(this.createCodeChunk(currentStruct, storage, 'rust'));
          currentStruct = '';
        }
        if (inImpl && currentImpl.trim()) {
          chunks.push(this.createCodeChunk(currentImpl, storage, 'rust'));
          currentImpl = '';
        }
        inFunction = inStruct = inImpl = false;
      }
    }

    return chunks;
  }

  /**
   * JavaScript/TypeScript代码分块
   */
  private async chunkJavaScriptCode(content: string, storage: Storage): Promise<ChunkData[]> {
    const chunks: ChunkData[] = [];
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+\w+[^{]*{/g;
    const classRegex = /(?:export\s+)?class\s+\w+[^{]*{/g;

    let match: RegExpExecArray | null;

    // 提取函数
    while ((match = functionRegex.exec(content)) !== null) {
      const functionStart = match.index;
      const functionCode = this.extractJSFunction(content, functionStart);
      if (functionCode) {
        chunks.push(this.createCodeChunk(functionCode, storage, 'javascript'));
      }
    }

    // 提取类
    functionRegex.lastIndex = 0;
    while ((match = classRegex.exec(content)) !== null) {
      const classStart = match.index;
      const classCode = this.extractJSClass(content, classStart);
      if (classCode) {
        chunks.push(this.createCodeChunk(classCode, storage, 'javascript'));
      }
    }

    return chunks;
  }

  /**
   * Python代码分块
   */
  private async chunkPythonCode(content: string, storage: Storage): Promise<ChunkData[]> {
    const chunks: ChunkData[] = [];
    const lines = content.split('\n');
    
    let currentFunction = '';
    let currentClass = '';
    let indentLevel = 0;
    let inFunction = false;
    let inClass = false;

    for (const line of lines) {
      const trimmed = line.trim();
      const currentIndent = line.length - line.trimStart().length;

      // 函数定义
      if (trimmed.startsWith('def ')) {
        if (currentFunction.trim()) {
          chunks.push(this.createCodeChunk(currentFunction, storage, 'python'));
        }
        currentFunction = line + '\n';
        inFunction = true;
        indentLevel = currentIndent;
      }
      // 类定义
      else if (trimmed.startsWith('class ')) {
        if (currentClass.trim()) {
          chunks.push(this.createCodeChunk(currentClass, storage, 'python'));
        }
        currentClass = line + '\n';
        inClass = true;
        indentLevel = currentIndent;
      }
      // 继续当前函数或类
      else if ((inFunction || inClass) && (currentIndent > indentLevel || trimmed === '')) {
        if (inFunction) currentFunction += line + '\n';
        if (inClass) currentClass += line + '\n';
      }
      // 函数或类结束
      else if ((inFunction || inClass) && currentIndent <= indentLevel && trimmed !== '') {
        if (inFunction && currentFunction.trim()) {
          chunks.push(this.createCodeChunk(currentFunction, storage, 'python'));
          currentFunction = '';
        }
        if (inClass && currentClass.trim()) {
          chunks.push(this.createCodeChunk(currentClass, storage, 'python'));
          currentClass = '';
        }
        inFunction = inClass = false;
      }
    }

    return chunks;
  }

  /**
   * 通用代码分块
   */
  private async chunkGenericCode(
    content: string,
    storage: Storage,
    config: ProcessingConfig
  ): Promise<ChunkData[]> {
    // 简单按行数分块
    const lines = content.split('\n');
    const chunks: ChunkData[] = [];
    const linesPerChunk = Math.max(Math.floor(config.chunkSize / 50), 20); // 假设平均每行50字符

    for (let i = 0; i < lines.length; i += linesPerChunk) {
      const chunkLines = lines.slice(i, i + linesPerChunk);
      const chunkContent = chunkLines.join('\n');
      
      if (chunkContent.trim()) {
        chunks.push(this.createCodeChunk(chunkContent, storage, this.detectCodeLanguage(storage.filename)));
      }
    }

    return chunks;
  }

  /**
   * 创建文本块数据
   */
  private createChunkData(content: string, storage: Storage): ChunkData {
    return {
      content: content.trim(),
      title: this.extractTitle(content),
      keywords: this.extractKeywords(content),
      chunkType: 'text',
      metadata: {
        fileSize: storage.filesize,
        importance: this.calculateImportance(content),
      }
    };
  }

  /**
   * 创建代码块数据
   */
  private createCodeChunk(content: string, storage: Storage, language: string): ChunkData {
    return {
      content: content.trim(),
      title: this.extractCodeTitle(content, language),
      keywords: this.extractCodeKeywords(content),
      chunkType: 'code',
      metadata: {
        codeLanguage: language,
        fileSize: storage.filesize,
        importance: this.calculateCodeImportance(content),
      }
    };
  }

  /**
   * 保存知识块
   */
  private async saveChunks(chunks: ChunkData[], storage: Storage, knowledgebaseId: string): Promise<void> {
    const knowledgeChunks = chunks.map(chunk => ({
      knowledgebaseId,
      storageId: storage.id,
      chunkType: chunk.chunkType || 'text',
      content: chunk.content,
      title: chunk.title,
      metadata: chunk.metadata,
      keywords: chunk.keywords,
      relevanceScore: this.calculateRelevanceScore(chunk),
    }));

    await this.chunkRepo.save(knowledgeChunks);
  }

  /**
   * 更新Storage处理状态
   */
  private async updateStorageProcessingState(
    storageId: string,
    status: 'processing' | 'completed' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (status === 'failed' && errorMessage) {
      updateData.metadata = { processingError: errorMessage };
    }

    await this.storageRepo.update(storageId, updateData);
  }

  /**
   * 更新知识库统计信息
   */
  private async updateKnowledgeBaseStats(knowledgebaseId: string, newChunksCount: number): Promise<void> {
    await this.kbRepo.increment({ id: knowledgebaseId }, 'totalChunks', newChunksCount);
    await this.kbRepo.update(knowledgebaseId, { lastUpdateAt: new Date() });
  }

  /**
   * 获取处理配置
   */
  private async getProcessingConfig(knowledgebaseId: string | null): Promise<ProcessingConfig> {
    const defaultConfig: ProcessingConfig = {
      chunkSize: 1000,
      chunkOverlap: 200,
      embeddingModel: 'text-embedding-3-small',
      enableCodeParsing: true,
      enableStructureExtraction: true,
    };

    if (!knowledgebaseId) {
      return defaultConfig;
    }

    const kb = await this.kbRepo.findOne({ where: { id: knowledgebaseId } });
    
    // 使用vectorConfig中的配置
    if (kb?.vectorConfig) {
      return { 
        ...defaultConfig,
        chunkSize: kb.vectorConfig.chunkSize || defaultConfig.chunkSize,
        chunkOverlap: kb.vectorConfig.chunkOverlap || defaultConfig.chunkOverlap,
        embeddingModel: kb.vectorConfig.embeddingModel || defaultConfig.embeddingModel,
      };
    }

    return defaultConfig;
  }

  // 工具方法
  private isCodeFile(extension: string): boolean {
    const codeExtensions = [
      '.rs', '.js', '.ts', '.py', '.java', '.cpp', '.c', '.go', '.php',
      '.rb', '.swift', '.kt', '.scala', '.sh', '.sql', '.css', '.scss',
      '.less', '.vue', '.jsx', '.tsx'
    ];
    return codeExtensions.includes(extension);
  }

  private extractTitle(content: string): string | undefined {
    const lines = content.split('\n');
    const firstLine = lines[0]?.trim();

    if (firstLine?.startsWith('#')) {
      return firstLine.replace(/^#+\s*/, '');
    }

    if (firstLine && firstLine.length < 100 && !firstLine.includes('{')) {
      return firstLine;
    }

    return undefined;
  }

  private extractCodeTitle(content: string, language: string): string | undefined {
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.match(/^(pub\s+)?fn\s+(\w+)/)) {
        return trimmed.match(/^(pub\s+)?fn\s+(\w+)/)?.[2];
      }
      if (trimmed.match(/^(export\s+)?function\s+(\w+)/)) {
        return trimmed.match(/^(export\s+)?function\s+(\w+)/)?.[2];
      }
      if (trimmed.match(/^def\s+(\w+)/)) {
        return trimmed.match(/^def\s+(\w+)/)?.[1];
      }
      if (trimmed.match(/^(pub\s+)?struct\s+(\w+)/)) {
        return trimmed.match(/^(pub\s+)?struct\s+(\w+)/)?.[2];
      }
      if (trimmed.match(/^class\s+(\w+)/)) {
        return trimmed.match(/^class\s+(\w+)/)?.[1];
      }
    }
    return undefined;
  }

  private extractKeywords(content: string): string[] {
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && word.length < 20);

    const wordCount: Record<string, number> = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    return Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  private extractCodeKeywords(code: string): string[] {
    const keywords: string[] = [];

    const functionMatches = code.match(/(?:function|fn|def|func)\s+(\w+)/g);
    if (functionMatches) {
      keywords.push(...functionMatches.map(match => match.split(/\s+/).pop()!).filter(Boolean));
    }

    const classMatches = code.match(/(?:class|struct|interface)\s+(\w+)/g);
    if (classMatches) {
      keywords.push(...classMatches.map(match => match.split(/\s+/).pop()!).filter(Boolean));
    }

    return [...new Set(keywords)];
  }

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

  private calculateImportance(content: string): number {
    let importance = 1;
    
    if (content.length > 500) importance += 1;
    if (content.includes('重要') || content.includes('关键') || content.includes('核心')) importance += 1;
    if (content.split('\n').length > 10) importance += 1;
    
    return Math.min(importance, 5);
  }

  private calculateCodeImportance(code: string): number {
    let importance = 1;

    if (code.includes('pub fn') || code.includes('public')) importance += 2;
    if (code.includes('///') || code.includes('/**') || code.includes('"""')) importance += 1;
    if (code.split('\n').length > 20) importance += 1;
    if (code.includes('Error') || code.includes('Exception') || code.includes('Result')) importance += 1;

    return Math.min(importance, 5);
  }

  private calculateRelevanceScore(chunkData: ChunkData): number {
    let score = 1.0;

    if (chunkData.title) score += 0.5;
    if (chunkData.metadata?.importance) score += chunkData.metadata.importance * 0.2;
    if (chunkData.content.length > 500) score += 0.3;
    if (chunkData.keywords && chunkData.keywords.length > 5) score += 0.2;

    return Math.min(score, 5.0);
  }

  private getOverlapText(text: string, overlapSize: number): string {
    if (text.length <= overlapSize) return text;
    return text.slice(-overlapSize);
  }

  private extractJsonContent(filePath: string): string {
    const jsonContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return JSON.stringify(jsonContent, null, 2);
  }

  private extractXmlContent(filePath: string): string {
    return fs.readFileSync(filePath, 'utf-8');
  }

  private extractJSFunction(content: string, startIndex: number): string | null {
    let braceCount = 0;
    let inFunction = false;
    let functionCode = '';

    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];
      functionCode += char;

      if (char === '{') {
        braceCount++;
        inFunction = true;
      } else if (char === '}') {
        braceCount--;
        if (inFunction && braceCount === 0) {
          return functionCode;
        }
      }
    }

    return null;
  }

  private extractJSClass(content: string, startIndex: number): string | null {
    let braceCount = 0;
    let inClass = false;
    let classCode = '';

    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];
      classCode += char;

      if (char === '{') {
        braceCount++;
        inClass = true;
      } else if (char === '}') {
        braceCount--;
        if (inClass && braceCount === 0) {
          return classCode;
        }
      }
    }

    return null;
  }
} 