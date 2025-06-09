import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, IsNull, In, SelectQueryBuilder, Brackets } from 'typeorm';
import { Storage } from './storage.entity';
import { StorageDir } from './storage-dir.entity';
import * as fs from 'fs';
import { join } from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as crypto from 'crypto';
import { JoyhouseConfigService } from '../common/joyhouse-config';

import { UserService } from '../user/user.service';
import { DocumentServiceClient } from '../knowledgebase/services/document-service.client';
import { extname } from 'path';
import { FileContent } from './file-content.entity';

@Injectable()
export class StorageService {
  constructor(
    @InjectRepository(Storage)
    private readonly storageRepo: Repository<Storage>,
    @InjectRepository(StorageDir)
    private readonly storageDirRepo: Repository<StorageDir>,
    private readonly userService: UserService,
  ) {}

  async createFileStorage(meta: Partial<Storage>, userId?: string): Promise<Storage> {
    return this.saveFile(meta, userId);
  }

  async saveFile(meta: Partial<Storage>, userId?: string): Promise<Storage> {
    // 设置默认type为'file'
    if (!meta.type) {
      meta.type = 'file';
    }

    // 新建文件时，禁止同目录下有同名文件或目录
    if (meta.storage_dir_id && meta.filename) {
      const existFile = await this.storageRepo.findOne({
        where: { storage_dir_id: meta.storage_dir_id, filename: meta.filename },
      });
      if (existFile) {
        // 如果文件已存在，创建新版本
        const version = (existFile.version || 1) + 1;
        if (!meta.filepath || !meta.url) {
          throw new Error('文件路径或URL未定义');
        }
        const newFilepath = meta.filepath.replace(/\.[^/.]+$/, `_v${version}$&`);
        const newUrl = meta.url.replace(/\.[^/.]+$/, `_v${version}$&`);
        
        // 复制文件到新路径
        fs.copyFileSync(meta.filepath, newFilepath);
        
        meta = {
          ...meta,
          version,
          filepath: newFilepath,
          url: newUrl,
        };
      } else {
        const existDir = await this.storageDirRepo.findOne({
          where: { parent: meta.storage_dir_id, name: meta.filename },
        });
        if (existDir) {
          throw new Error('同目录下已存在同名目录');
        }
      }
    }
    const entity = this.storageRepo.create(meta);
    const saved = await this.storageRepo.save(entity);
   
    return saved;
  }

  // 目录重命名
  async renameDir(id: string, newName: string): Promise<void> {
    const dir = await this.storageDirRepo.findOneBy({ id });
    if (!dir) throw new Error('目录不存在');
    // 检查同级目录/文件重名
    const existDir = await this.storageDirRepo.findOne({
      where: { 
        parent: dir.parent === null || dir.parent === undefined ? IsNull() : dir.parent, 
        name: newName 
      },
    });
    if (existDir) throw new Error('同级目录下已存在同名目录');
    const existFile = await this.storageRepo.findOne({
      where: { 
        storage_dir_id: dir.parent === null || dir.parent === undefined ? IsNull() : dir.parent, 
        filename: newName 
      },
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
    if (dto.parent && dto.parent !== '' && dto.parent !== null) {
      const parentDir = await this.storageDirRepo.findOneBy({ id: dto.parent });
      if (!parentDir) {
        throw new Error('父目录不存在');
      }
    }
    
    // 处理空字符串的情况，将其转换为null
    if (dto.parent === '') {
      dto.parent = null;
    }
    // 检查同级目录下是否有同名目录
    const existDir = await this.storageDirRepo.findOne({
      where: { 
        parent: dto.parent === null || dto.parent === undefined ? IsNull() : dto.parent, 
        name: dto.name, 
        userId: dto.userId 
      },
    });
    if (existDir) {
      throw new Error('同级目录下已存在同名目录');
    }
    // 检查同级目录下是否有同名文件
    const existFile = await this.storageRepo.findOne({
      where: { 
        storage_dir_id: dto.parent === null || dto.parent === undefined ? IsNull() : dto.parent, 
        filename: dto.name 
      },
    });
    if (existFile) {
      throw new Error('同级目录下已存在同名文件');
    }
    const entity = this.storageDirRepo.create(dto);
    return this.storageDirRepo.save(entity);
  }

  // 查询当前目录下的所有目录和文件
  async findDirContents(id: string, userId: string) {
    const [dirs, files] = await Promise.all([
      this.storageDirRepo.find({
        where: [
          { parent: id, userId },
          { parent: id, isPublic: true },
          { parent: id, sharedWith: Like(`%${userId}%`) },
        ],
        order: { sortOrder: 'ASC', name: 'ASC' },
      }),
      this.storageRepo.find({
        where: [
          { storage_dir_id: id, userId },
          { storage_dir_id: id, isPublic: true },
          { storage_dir_id: id, sharedWith: Like(`%${userId}%`) },
        ],
        order: { createdAt: 'DESC' },
      }),
    ]);
    return { dirs, files };
  }

  // 删除单个文件
  async removeFile(id: string): Promise<void> {
    const file = await this.storageRepo.findOneBy({ id });
    if (file) {
      // 删除物理文件
      try {
        fs.unlinkSync(file.filepath);
      } catch (error) {
        console.error('删除文件失败:', error);
      }
      // 删除数据库记录
      await this.storageRepo.delete(id);
    }
  }

  // 删除目录及其所有子目录和文件
  async removeDir(id: string): Promise<void> {
    // 递归删除所有子目录
    const subDirs = await this.storageDirRepo.find({ where: { parent: id } });
    for (const dir of subDirs) {
      await this.removeDir(dir.id);
    }
    // 删除目录下所有文件
    const files = await this.storageRepo.find({ where: { storage_dir_id: id } });
    for (const file of files) {
      await this.removeFile(file.id);
    }
    // 删除目录自身
    await this.storageDirRepo.delete(id);
  }

  async findDirByUserIdAndName(userId: string, name: string) {
    return this.storageDirRepo.findOne({
      where: { userId: userId, name, parent: IsNull() },
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

  // 搜索文件和目录
  async search(userId: string, keyword: string) {
    const [dirs, files] = await Promise.all([
      this.storageDirRepo.find({
        where: [
          { userId, name: Like(`%${keyword}%`) },
          { isPublic: true, name: Like(`%${keyword}%`) },
          { sharedWith: Like(`%${userId}%`), name: Like(`%${keyword}%`) },
        ],
      }),
      this.storageRepo.find({
        where: [
          { userId, filename: Like(`%${keyword}%`) },
          { isPublic: true, filename: Like(`%${keyword}%`) },
          { sharedWith: Like(`%${userId}%`), filename: Like(`%${keyword}%`) },
        ],
      }),
    ]);
    return { dirs, files };
  }

  // 分享文件或目录
  async share(id: string, type: 'file' | 'dir', userIds: string[], permissions: 'read' | 'write' | 'admin') {
    if (type === 'file') {
      const file = await this.storageRepo.findOneBy({ id });
      if (!file) throw new Error('文件不存在');
      file.sharedWith = userIds;
      file.sharePermissions = userIds.map(userId => ({ userId, permission: permissions }));
      await this.storageRepo.save(file);
    } else {
      const dir = await this.storageDirRepo.findOneBy({ id });
      if (!dir) throw new Error('目录不存在');
      dir.sharedWith = userIds;
      dir.sharePermissions = userIds.map(userId => ({ userId, permission: permissions }));
      await this.storageDirRepo.save(dir);
    }
  }

  // 获取文件版本历史
  async getFileVersions(id: string) {
    const file = await this.storageRepo.findOneBy({ id });
    if (!file) throw new Error('文件不存在');
    
    const versions = await this.storageRepo.find({
      where: {
        filename: file.filename,
        storage_dir_id: file.storage_dir_id,
      },
      order: { version: 'DESC' },
    });
    
    return versions;
  }



  // 更新目录信息
  async updateDir(id: string, data: Partial<StorageDir>): Promise<StorageDir> {
    const dir = await this.storageDirRepo.findOneBy({ id });
    if (!dir) {
      throw new Error('目录不存在');
    }
    
    Object.assign(dir, data);
    return this.storageDirRepo.save(dir);
  }

  // 获取目录树
  async getDirTree(userId: string) {
    const dirs = await this.storageDirRepo.find({
      where: { userId }
    })
    const dirMap = new Map<string, StorageDir & { children: StorageDir[] }>()
    dirs.forEach(dir => {
      dirMap.set(dir.id, { ...dir, children: [] })
    })
    const tree: (StorageDir & { children: StorageDir[] })[] = []
    dirs.forEach(dir => {
      const dirWithChildren = dirMap.get(dir.id)!
      if (dir.parent) {
        const parent = dirMap.get(dir.parent)
        if (parent) {
          parent.children.push(dirWithChildren)
        }
      } else {
        tree.push(dirWithChildren)
      }
    })
    return tree
  }

  // 获取目录面包屑
  async getDirBreadcrumbs(dirId: string, userId: string) {
    const breadcrumbs: { id: string, name: string }[] = []
    let currentDir = await this.storageDirRepo.findOne({
      where: { id: dirId, userId }
    })
    while (currentDir) {
      breadcrumbs.unshift({ id: currentDir.id, name: currentDir.name })
      if (currentDir.parent) {
        currentDir = await this.storageDirRepo.findOne({
          where: { id: currentDir.parent, userId }
        })
      } else {
        break
      }
    }
    return breadcrumbs
  }

  // 根据ID查找文件
  async findFileById(id: string): Promise<Storage> {
    const file = await this.storageRepo.findOneBy({ id });
    if (!file) {
      throw new Error('文件不存在');
    }
    return file;
  }

  async extractContent(fileId: string, userId: string) {
    // 校验文件归属
    const file = await this.findFileById(fileId);
    if (!file || file.userId !== userId) throw new Error('无权限或文件不存在');
  
  }

  // 查找单个文件 2025-06-09
  async findOne(id: string): Promise<Storage> {
    const file = await this.storageRepo.findOne({ where: { id } });
    if (!file) {
      throw new Error('文件不存在');
    }
    return file;
  }
}
