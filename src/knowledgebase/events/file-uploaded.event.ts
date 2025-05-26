export class FileUploadedEvent {
  constructor(
    public readonly fileId: string,
    public readonly knowledgebaseId: string,
    public readonly userId: string,
    public readonly filePath: string,
    public readonly filename: string,
    public readonly processingConfig?: any,
  ) {}
} 