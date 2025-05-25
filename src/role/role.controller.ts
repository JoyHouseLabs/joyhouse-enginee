import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RoleService } from './role.service';
import { Role } from './role.entity';
import { UserRole } from './user-role.entity';
import { Permission } from './permission.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from './role.guard';
import { Roles } from './roles.decorator';

@ApiTags('roles')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiBearerAuth()
@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  // 角色管理
  @Get()
  @ApiOperation({ summary: '获取所有角色' })
  @ApiResponse({ status: 200, description: '返回所有角色列表', type: [Role] })
  @Roles('admin')
  async getRoles(): Promise<Role[]> {
    return this.roleService.getAllRoles();
  }

  /**
   * 自动扫描所有controller方法并同步到permission表，并为每个接口分配多个默认角色
   * @param dto.defaultRoleNames 角色名数组
   * @returns 新增的接口权限数量
   */
  @Post('sync-permissions')
  @ApiOperation({ summary: '同步权限' })
  @ApiResponse({ status: 200, description: '返回新增的接口权限数量' })
  @Roles('admin')
  async syncPermissions(
    @Body() dto: { defaultRoleNames: string[] },
  ): Promise<{ inserted: number }> {
    const inserted = await this.roleService.syncAllApiToPermission(
      dto.defaultRoleNames,
    );
    return { inserted };
  }

  @Post('create')
  @ApiOperation({ summary: '创建角色' })
  @ApiResponse({ status: 201, description: '成功创建角色', type: Role })
  @Roles('admin')
  async createRole(
    @Body() dto: { name: string; description?: string; userId?: string },
  ): Promise<Role> {
    return this.roleService.createRole(dto, dto.userId);
  }

  @Post('delete')
  @ApiOperation({ summary: '删除角色' })
  @ApiResponse({ status: 200, description: '成功删除角色' })
  @Roles('admin')
  async deleteRole(
    @Body() dto: { id: string; userId?: string },
  ): Promise<void> {
    return this.roleService.deleteRole(dto.id, dto.userId);
  }

  // 用户-角色管理
  @Post('user/get')
  @ApiOperation({ summary: '获取用户角色' })
  @ApiResponse({
    status: 200,
    description: '返回用户角色列表',
    type: [UserRole],
  })
  @Roles('admin')
  async getUserRoles(@Body() dto: { userId: string }): Promise<UserRole[]> {
    return this.roleService.getUserRoleRelations(dto.userId);
  }

  @Post('user')
  @ApiOperation({ summary: '分配角色给用户' })
  @ApiResponse({ status: 201, description: '成功分配角色', type: UserRole })
  @Roles('admin')
  async assignRoleToUser(
    @Body() dto: { userId: string; role_id: string; operator_id?: string },
  ): Promise<UserRole> {
    return this.roleService.assignRoleToUser(
      dto.userId,
      dto.role_id,
      dto.operator_id,
    );
  }

  @Post('user/remove')
  @ApiOperation({ summary: '移除用户角色' })
  @ApiResponse({ status: 200, description: '成功移除用户角色' })
  @Roles('admin')
  async removeUserRole(
    @Body() dto: { id: string; operator_id?: string },
  ): Promise<void> {
    return this.roleService.removeUserRole(dto.id, dto.operator_id);
  }

  // 权限管理
  @Post('permission/get')
  @ApiOperation({ summary: '获取角色权限' })
  @ApiResponse({
    status: 200,
    description: '返回角色权限列表',
    type: [Permission],
  })
  @Roles('admin')
  async getRolePermissions(
    @Body() dto: { role_id: string },
  ): Promise<Permission[]> {
    return this.roleService.getRolePermissions(dto.role_id);
  }

  @Post('permission')
  @ApiOperation({ summary: '添加权限' })
  @ApiResponse({ status: 201, description: '成功添加权限', type: Permission })
  @Roles('admin')
  async addPermission(
    @Body()
    dto: {
      role_id: string;
      controller: string;
      method: string;
      userId?: string;
    },
  ): Promise<Permission> {
    return this.roleService.addPermission(dto, dto.userId);
  }

  @Post('permission/remove')
  @ApiOperation({ summary: '移除权限' })
  @ApiResponse({ status: 200, description: '成功移除权限' })
  @Roles('admin')
  async removePermission(
    @Body() dto: { id: string; userId?: string },
  ): Promise<void> {
    return this.roleService.removePermission(dto.id, dto.userId);
  }
}
