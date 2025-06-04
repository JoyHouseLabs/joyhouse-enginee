import { BaseImporter, ImportResult } from './base.importer';
import axios from 'axios';
import { extname } from 'path';

export interface UrlImportParams {
  url: string;
  storage_dir_id: string;
}

export class UrlImporter extends BaseImporter {
  async import(params: UrlImportParams): Promise<ImportResult> {
    const response = await axios.get(params.url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const urlObj = new URL(params.url);
    const pathname = urlObj.pathname;
    const originalFilename = pathname.split('/').pop() || 'downloaded_file';
    const ext = extname(originalFilename);
    
    const filename = this.generateFilename(originalFilename, ext);
    const filepath = this.saveFile(response.data, filename);
    const fileUrl = this.generateFileUrl(filename);

    return {
      filename,
      filepath,
      filetype: response.headers['content-type'] || 'application/octet-stream',
      filesize: response.data.length,
      url: fileUrl,
      storage_dir_id: params.storage_dir_id,
      metadata: {
        originalUrl: params.url,
        contentType: response.headers['content-type'],
      }
    };
  }
} 