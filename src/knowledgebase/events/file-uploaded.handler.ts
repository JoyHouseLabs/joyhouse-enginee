import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { FileUploadedEvent } from './file-uploaded.event';
import { DocumentServiceClient } from '../services/document-service.client';

@EventsHandler(FileUploadedEvent)
export class FileUploadedHandler implements IEventHandler<FileUploadedEvent> {
  private readonly logger = new Logger(FileUploadedHandler.name);

  constructor(
    private readonly documentServiceClient: DocumentServiceClient,
  ) {}

  async handle(event: FileUploadedEvent) {
    this.logger.log(`Handling file uploaded event: ${event.fileId}`);

    try {
      // 提交文档处理任务到文档服务
      const result = await this.documentServiceClient.processDocument({
        fileId: event.fileId,
        filePath: event.filePath,
        userId: event.userId,
        processingConfig: event.processingConfig,
      });

      this.logger.log(`Document processing task created: ${result.taskId} for file: ${event.fileId}`);
    } catch (error) {
      this.logger.error(`Failed to process document ${event.fileId}:`, error.message);
      // 这里可以添加错误处理逻辑，比如更新文件状态为失败
    }
  }
} 