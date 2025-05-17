import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { RoleService } from './role.service';
import { Role } from './role.entity';
import { UserRole } from './user-role.entity';
import { Permission } from './permission.entity';

@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  // 角色管理
  @Get()
  async getRoles(): Promise<Role[]> {
    return this.roleService.getAllRoles();
  }

  /**
   * 自动扫描所有controller方法并同步到permission表，并为每个接口分配多个默认角色
   * @param dto.defaultRoleNames 角色名数组
   * @returns 新增的接口权限数量
   */
  @Post('sync-permissions')
  async syncPermissions(@Body() dto: { defaultRoleNames: string[] }): Promise<{ inserted: number }> {
    const inserted = await this.roleService.syncAllApiToPermission(dto.defaultRoleNames);
    return { inserted };
  }

  @Post('create')
  async createRole(@Body() dto: { name: string; description?: string; user_id?: string }): Promise<Role> {
    return this.roleService.createRole(dto, dto.user_id);
  }

  @Post('delete')
  async deleteRole(@Body() dto: { id: string; user_id?: string }): Promise<void> {
    return this.roleService.deleteRole(dto.id, dto.user_id);
  }

  // 用户-角色管理
  @Post('user/get')
  async getUserRoles(@Body() dto: { user_id: string }): Promise<UserRole[]> {
    return this.roleService.getUserRoleRelations(dto.user_id);
  }

  @Post('user')
  async assignRoleToUser(@Body() dto: { user_id: string; role_id: string; operator_id?: string }): Promise<UserRole> {
    return this.roleService.assignRoleToUser(dto.user_id, dto.role_id, dto.operator_id);
  }

  @Post('user/remove')
  async removeUserRole(@Body() dto: { id: string; operator_id?: string }): Promise<void> {
    return this.roleService.removeUserRole(dto.id, dto.operator_id);
  }

  // 权限管理
  @Post('permission/get')
  async getRolePermissions(@Body() dto: { role_id: string }): Promise<Permission[]> {
    return this.roleService.getRolePermissions(dto.role_id);
  }

  @Post('permission')
  async addPermission(@Body() dto: { role_id: string; controller: string; method: string; user_id?: string }): Promise<Permission> {
    return this.roleService.addPermission(dto, dto.user_id);
  }

  @Post('permission/remove')
  async removePermission(@Body() dto: { id: string; user_id?: string }): Promise<void> {
    return this.roleService.removePermission(dto.id, dto.user_id);
  }
}
