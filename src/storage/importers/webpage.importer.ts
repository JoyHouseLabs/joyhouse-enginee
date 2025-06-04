import { BaseImporter, ImportResult } from './base.importer';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface WebpageImportParams {
  url: string;
  storage_dir_id: string;
}

export class WebpageImporter extends BaseImporter {
  async import(params: WebpageImportParams): Promise<ImportResult> {
    const response = await axios.get(params.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const title = $('title').text().trim() || 'webpage';
    const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    const filename = this.generateFilename(sanitizedTitle, 'html');
    const filepath = this.saveFile(response.data, filename);
    const fileUrl = this.generateFileUrl(filename);

    return {
      filename,
      filepath,
      filetype: 'text/html',
      filesize: response.data.length,
      url: fileUrl,
      storage_dir_id: params.storage_dir_id,
      metadata: {
        originalUrl: params.url,
        title: title,
        description: $('meta[name="description"]').attr('content'),
        keywords: $('meta[name="keywords"]').attr('content'),
      }
    };
  }
} 