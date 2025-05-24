import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note, NoteType } from './note.entity';
import { NoteCreateDto } from './note-create.dto';
import { NoteListItemDto } from './note-list.dto';
import { NoteQueryDto } from './note-query.dto';
import { NoteUpdateDto } from './note-update.dto';
import { ulid } from 'ulid';

@Injectable()
export class NoteService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepo: Repository<Note>,
  ) {}

  async findById(id: string, userId: string): Promise<Note | null> {
    return this.noteRepo.findOneBy({ id, userId });
  }

  async findAll(
    userId: string,
    page = 1,
    pageSize = 10,
    title?: string,
    content?: string,
    type?: NoteType,
    isPublic?: boolean,
  ): Promise<{ data: Note[]; total: number }> {
    const qb = this.noteRepo.createQueryBuilder('note');

    if (isPublic) {
      qb.where('note.who_can_see = :visibility', { visibility: 'public' });
    } else {
      qb.where('note.userId = :userId', { userId });
    }

    if (title) {
      qb.andWhere('note.title LIKE :title', { title: `%${title}%` });
    }

    if (content) {
      qb.andWhere('note.content LIKE :content', { content: `%${content}%` });
    }

    if (type) {
      qb.andWhere('note.type = :type', { type });
    }

    qb.orderBy('note.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async create(note: Partial<Note>, userId: string): Promise<Note> {
    const entity = this.noteRepo.create({
      ...note,
      id: ulid(),
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return this.noteRepo.save(entity);
  }

  async update(
    id: string,
    userId: string,
    patch: Partial<Note>,
  ): Promise<Note | undefined> {
    const note = await this.noteRepo.findOneBy({ id, userId });
    if (!note) return undefined;
    Object.assign(note, patch, { updatedAt: new Date() });
    return this.noteRepo.save(note);
  }

  async remove(id: string, userId: string): Promise<boolean> {
    const note = await this.noteRepo.findOneBy({ id, userId });
    if (!note) return false;
    await this.noteRepo.remove(note);
    return true;
  }

  async incrementSelfView(id: string, userId: string): Promise<boolean> {
    const note = await this.noteRepo.findOneBy({ id, userId });
    if (!note) return false;
    note.selfViewTimes += 1;
    await this.noteRepo.save(note);
    return true;
  }

  async incrementOtherView(id: string, userId: string): Promise<boolean> {
    const note = await this.noteRepo.findOneBy({ id });
    if (!note) return false;
    // 确保不是作者自己查看
    if (note.userId === userId) return false;
    note.otherViewTimes += 1;
    await this.noteRepo.save(note);
    return true;
  }
}
