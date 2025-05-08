import { Module } from '@nestjs/common';
import { LlmModule } from './llm/llm.module';
import { StorageModule } from './storage/storage.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Note } from './entities/note.entity';
import { Wallet } from './entities/wallet.entity';
import { Storage } from './entities/storage.entity'
import { LlmProvider } from './entities/llm-provider.entity'
import { LlmModel } from './entities/llm-model.entity';
import { UserModule } from './user/user.module';
import { NoteModule } from './note/note.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Relay } from './entities/relay.entity';
import { RelayModule } from './relay/relay.module';
import { ReplyModule } from './reply/reply.module';
import { Reply } from './entities/reply.entity';
import { Knowledgebase } from './entities/knowledgebase.entity';
import { Knowledgefile } from './entities/knowledgefile.entity';
import { KnowledgebaseModule } from './knowledgebase/knowledgebase.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'joyhouse.db',
      entities: [User, Note, Wallet, Storage, LlmProvider, LlmModel, Relay, Reply, Knowledgebase, Knowledgefile],
      synchronize: true,
    }),
    UserModule, 
    NoteModule, 
    RelayModule,
    StorageModule, 
    ReplyModule,
    LlmModule,
    KnowledgebaseModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
