import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Storage } from './storage.entity';
import { StorageDir } from './storage-dir.entity';

@Injectable()
export class StorageService {
  constructor(
    @InjectRepository(Storage)
    private readonly storageRepo: Repository<Storage>,
    @InjectRepository(StorageDir)
    private readonly storageDirRepo: Repository<StorageDir>,
  ) {}

  async saveFile(meta: Partial<Storage>): Promise<Storage> {
    // 新建文件时，禁止同目录下有同名文件或目录
    if (meta.storage_dir_id && meta.filename) {
      const existFile = await this.storageRepo.findOne({
        where: { storage_dir_id: meta.storage_dir_id, filename: meta.filename },
      });
      if (existFile) {
        throw new Error('同目录下已存在同名文件');
      }
      const existDir = await this.storageDirRepo.findOne({
        where: { parent: meta.storage_dir_id, name: meta.filename },
      });
      if (existDir) {
        throw new Error('同目录下已存在同名目录');
      }
    }
    const entity = this.storageRepo.create(meta);
    return this.storageRepo.save(entity);
  }

  // 目录重命名
  async renameDir(id: string, newName: string): Promise<void> {
    const dir = await this.storageDirRepo.findOneBy({ id });
    if (!dir) throw new Error('目录不存在');
    // 检查同级目录/文件重名
    const existDir = await this.storageDirRepo.findOne({
      where: { parent: dir.parent, name: newName },
    });
    if (existDir) throw new Error('同级目录下已存在同名目录');
    const existFile = await this.storageRepo.findOne({
      where: { storage_dir_id: dir.parent, filename: newName },
    });
    if (existFile) throw new Error('同级目录下已存在同名文件');
    dir.name = newName;
    await this.storageDirRepo.save(dir);
  }

  // 文件重命名
  async renameFile(id: string, newName: string): Promise<void> {
    const file = await this.storageRepo.findOneBy({ id });
    if (!file) throw new Error('文件不存在');
    // 检查同级目录/文件重名
    const existFile = await this.storageRepo.findOne({
      where: { storage_dir_id: file.storage_dir_id, filename: newName },
    });
    if (existFile) throw new Error('同目录下已存在同名文件');
    const existDir = await this.storageDirRepo.findOne({
      where: { parent: file.storage_dir_id, name: newName },
    });
    if (existDir) throw new Error('同目录下已存在同名目录');
    file.filename = newName;
    await this.storageRepo.save(file);
  }

  // 可扩展：查找、删除等

  async createDir(dto: Partial<StorageDir>): Promise<StorageDir> {
    if (dto.parent && dto.parent !== '') {
      const parentDir = await this.storageDirRepo.findOneBy({ id: dto.parent });
      if (!parentDir) {
        throw new Error('父目录不存在');
      }
    }
    // 检查同级目录下是否有同名目录
    const existDir = await this.storageDirRepo.findOne({
      where: { parent: dto.parent, name: dto.name },
    });
    if (existDir) {
      throw new Error('同级目录下已存在同名目录');
    }
    // 检查同级目录下是否有同名文件
    const existFile = await this.storageRepo.findOne({
      where: { storage_dir_id: dto.parent, filename: dto.name },
    });
    if (existFile) {
      throw new Error('同级目录下已存在同名文件');
    }
    const entity = this.storageDirRepo.create(dto);
    return this.storageDirRepo.save(entity);
  }

  // 查询当前目录下的所有目录和文件
  async findDirContents(id: string) {
    const dirs = await this.storageDirRepo.find({
      where: { parent: id },
    });
    const files = await this.storageRepo.find({
      where: { storage_dir_id: id },
    });
    return { dirs, files };
  }

  // 删除单个文件
  async removeFile(id: string): Promise<void> {
    await this.storageRepo.delete(id);
  }

  // 删除目录及其所有子目录和文件
  async removeDir(id: string): Promise<void> {
    // 递归删除所有子目录
    const subDirs = await this.storageDirRepo.find({ where: { parent: id } });
    for (const dir of subDirs) {
      await this.removeDir(dir.id);
    }
    // 删除目录下所有文件
    await this.storageRepo.delete({ storage_dir_id: id });
    // 删除目录自身
    await this.storageDirRepo.delete(id);
  }

  async findDirByUserIdAndName(userId: string, name: string) {
    return this.storageDirRepo.findOne({
      where: { userId: userId, name, parent: '' },
    });
  }

  async findUserDirectories(userId: string) {
    const [homeDir, shareDir] = await Promise.all([
      this.findDirByUserIdAndName(userId, 'home'),
      this.findDirByUserIdAndName(userId, 'share'),
    ]);

    return {
      home: homeDir?.id || '',
      share: shareDir?.id || '',
    };
  }
}
