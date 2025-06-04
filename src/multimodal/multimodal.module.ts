import { Module, forwardRef } from '@nestjs/common'
import { MultimodalService } from './multimodal.service'
import { Blip2Extractor } from './extractors/blip2.extractor'
import { StorageModule } from '../storage/storage.module'

@Module({
  imports: [forwardRef(() => StorageModule)],
  providers: [MultimodalService, Blip2Extractor],
  exports: [MultimodalService],
})
export class MultimodalModule {} 