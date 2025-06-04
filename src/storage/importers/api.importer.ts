import { BaseImporter, ImportResult } from './base.importer';
import axios from 'axios';
import { extname } from 'path';

export interface ApiImportParams {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: any;
  storage_dir_id: string;
}

export class ApiImporter extends BaseImporter {
  async import(params: ApiImportParams): Promise<ImportResult> {
    const response = await axios({
      method: params.method || 'GET',
      url: params.url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        ...params.headers
      },
      data: params.body
    });

    const urlObj = new URL(params.url);
    const pathname = urlObj.pathname;
    const apiName = pathname.split('/').pop() || 'api_data';
    
    const filename = this.generateFilename(apiName, 'json');
    const data = JSON.stringify(response.data, null, 2);
    const filepath = this.saveFile(data, filename);
    const fileUrl = this.generateFileUrl(filename);

    return {
      filename,
      filepath,
      filetype: 'application/json',
      filesize: data.length,
      url: fileUrl,
      storage_dir_id: params.storage_dir_id,
      metadata: {
        originalUrl: params.url,
        method: params.method,
        headers: params.headers,
        requestBody: params.body,
        responseStatus: response.status,
        responseHeaders: response.headers,
      }
    };
  }
} 