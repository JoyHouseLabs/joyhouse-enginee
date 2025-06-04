import { Storage } from '../storage.entity';
import { JoyhouseConfigService } from '../../common/joyhouse-config';
import * as fs from 'fs';
import * as crypto from 'crypto';

export interface ImportResult {
  filename: string;
  filepath: string;
  filetype: string;
  filesize: number;
  url: string;
  storage_dir_id: string;
  metadata?: Record<string, any>;
}

export abstract class BaseImporter {
  protected config = JoyhouseConfigService.loadConfig();
  protected uploadDir = this.config.uploadDir;
  protected fileDomain = this.config.fileDomain;

  protected generateFilename(originalName: string, extension: string): string {
    const randomStr = crypto.randomBytes(8).toString('hex');
    return `${Date.now()}-${originalName}-${randomStr}${extension ? '.' + extension : ''}`;
  }

  protected saveFile(content: Buffer | string, filename: string): string {
    const filepath = `${this.uploadDir}/${filename}`;
    fs.writeFileSync(filepath, content);
    return filepath;
  }

  protected generateFileUrl(filename: string): string {
    return `${this.fileDomain}/uploads/${filename}`;
  }

  abstract import(params: any): Promise<ImportResult>;
} 