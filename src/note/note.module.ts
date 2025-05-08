import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Note } from '../entities/note.entity';
import { NoteService } from './note.service';
import { NoteController } from './note.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Note])],
  providers: [NoteService],
  controllers: [NoteController],
  exports: [NoteService],
})
export class NoteModule {}
