import { BaseImporter } from './base.importer';
import { UrlImporter } from './url.importer';
import { WebpageImporter } from './webpage.importer';
import { ApiImporter } from './api.importer';

export enum ImporterType {
  URL = 'url',
  WEBPAGE = 'webpage',
  API = 'api',
  DISCORD = 'discord',
  TWITTER = 'twitter',
  GITHUB = 'github',
}

export class ImporterFactory {
  private static importers: Map<ImporterType, BaseImporter> = new Map();

  static getImporter(type: ImporterType): BaseImporter {
    if (!this.importers.has(type)) {
      let importer: BaseImporter;

      switch (type) {
        case ImporterType.URL:
          importer = new UrlImporter();
          break;
        case ImporterType.WEBPAGE:
          importer = new WebpageImporter();
          break;
        case ImporterType.API:
          importer = new ApiImporter();
          break;
        // 后续可以添加其他导入器
        default:
          throw new Error(`Unsupported importer type: ${type}`);
      }

      this.importers.set(type, importer);
    }

    return this.importers.get(type)!;
  }
} 