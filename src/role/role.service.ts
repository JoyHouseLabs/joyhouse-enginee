import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './role.entity';
import { UserRole } from './user-role.entity';
import { Permission } from './permission.entity';
import { OperationLogService } from '../audit/operation-log.service';
import { scanAllControllerMethods } from './sync-permissions.util';
import * as path from 'path';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @Inject(forwardRef(() => OperationLogService))
    private readonly logService: OperationLogService,
  ) {}

  // 获取用户所有角色
  async getUserRoles(userId: string): Promise<Role[]> {
    const userRoles = await this.userRoleRepo.find({
      where: { userId: userId },
    });
    const roleIds = userRoles.map((ur) => ur.role_id);
    if (!roleIds.length) return [];
    return this.roleRepo.findByIds(roleIds);
  }

  // 获取接口允许的角色
  async getAllowedRoles(controller: string, method: string): Promise<Role[]> {
    const perms = await this.permissionRepo.find({
      where: { controller, method },
    });
    const roleIds = perms.map((p) => p.role_id);
    if (!roleIds.length) return [];
    return this.roleRepo.findByIds(roleIds);
  }

  // 判断用户是否有权限访问接口
  async userHasPermission(
    userId: string,
    controller: string,
    method: string,
  ): Promise<boolean> {
    const userRoles = await this.getUserRoles(userId);
    const allowedRoles = await this.getAllowedRoles(controller, method);
    const userRoleIds = userRoles.map((r) => r.id);
    const allowedRoleIds = allowedRoles.map((r) => r.id);
    return userRoleIds.some((id) => allowedRoleIds.includes(id));
  }

  // 角色管理
  async getAllRoles(): Promise<Role[]> {
    return this.roleRepo.find();
  }
  async createRole(
    dto: { name: string; description?: string },
    userId?: string,
  ): Promise<Role> {
    const entity = this.roleRepo.create(dto);
    const saved = await this.roleRepo.save(entity);
    if (userId)
      await this.logService.log(
        userId,
        'create_role',
        { role_id: saved.id },
        dto,
      );
    return saved;
  }
  async deleteRole(id: string, userId?: string): Promise<void> {
    await this.roleRepo.delete(id);
    if (userId)
      await this.logService.log(userId, 'delete_role', { role_id: id });
  }

  // 用户-角色管理
  async getUserRoleRelations(userId: string): Promise<UserRole[]> {
    return this.userRoleRepo.find({ where: { userId: userId } });
  }
  async assignRoleToUser(
    userId: string,
    role_id: string,
    operator_id?: string,
  ): Promise<UserRole> {
    const entity = this.userRoleRepo.create({ userId, role_id });
    const saved = await this.userRoleRepo.save(entity);
    if (operator_id)
      await this.logService.log(operator_id, 'assign_role_to_user', {
        userId,
        role_id,
      });
    return saved;
  }
  async removeUserRole(id: string, operator_id?: string): Promise<void> {
    const userRole = await this.userRoleRepo.findOne({ where: { id } });
    await this.userRoleRepo.delete(id);
    if (operator_id)
      await this.logService.log(operator_id, 'remove_user_role', {
        id,
        userRole,
      });
  }

  // 权限管理
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    return this.permissionRepo.find({ where: { role_id: roleId } });
  }
  async addPermission(
    dto: { role_id: string; controller: string; method: string },
    userId?: string,
  ): Promise<Permission> {
    const entity = this.permissionRepo.create(dto);
    const saved = await this.permissionRepo.save(entity);
    if (userId)
      await this.logService.log(
        userId,
        'add_permission',
        { permission_id: saved.id },
        dto,
      );
    return saved;
  }
  async removePermission(id: string, userId?: string): Promise<void> {
    const perm = await this.permissionRepo.findOne({ where: { id } });
    await this.permissionRepo.delete(id);
    if (userId)
      await this.logService.log(userId, 'remove_permission', { id, perm });
  }

  /**
   * 自动扫描所有controller方法并同步到permission表，并为每个接口分配多个默认角色
   * @param defaultRoleNames 默认角色名数组（如 ['admin','user']）
   */
  async syncAllApiToPermission(defaultRoleNames: string[]): Promise<number> {
    const srcDir = path.join(__dirname, '../');
    const apiList = scanAllControllerMethods(srcDir);
    // 获取所有默认角色
    const roles: Role[] = [];
    for (const name of defaultRoleNames) {
      let role = await this.roleRepo.findOne({ where: { name } });
      if (!role) {
        role = await this.roleRepo.save(
          this.roleRepo.create({ name, description: '自动同步创建' }),
        );
      }
      roles.push(role);
    }
    let inserted = 0;
    for (const api of apiList) {
      for (const role of roles) {
        const exist = await this.permissionRepo.findOne({
          where: {
            controller: api.controller,
            method: api.method,
            role_id: role.id,
          },
        });
        if (!exist) {
          await this.permissionRepo.save(
            this.permissionRepo.create({
              controller: api.controller,
              method: api.method,
              role_id: role.id,
            }),
          );
          inserted++;
        }
      }
    }
    return inserted;
  }
}
