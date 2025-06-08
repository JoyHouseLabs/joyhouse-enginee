import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './role.decorator';
import { RoleService } from './role.service';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(forwardRef(() => RoleService))
    private readonly roleService: RoleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    console.log('[RoleGuard] request.user:', user);
    if (!user || !user.id) {
      console.log('[RoleGuard] 未登录, user:', user);
      throw new ForbiddenException('未登录2');
    }
    // 获取当前 controller 和 handler 名
    const handler = context.getHandler();
    const controller = context.getClass();
    const controllerName = controller.name
      .replace('Controller', '')
      .toLowerCase();
    const methodName = handler.name;
    console.log(
      '[RoleGuard] controllerName:',
      controllerName,
      'methodName:',
      methodName,
    );

    // 优先用 @Roles 装饰器（静态），否则查数据库（动态）
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [handler, controller],
    );
    let allowedRoles: string[] = [];
    if (requiredRoles && requiredRoles.length) {
      allowedRoles = requiredRoles;
    } else {
      // 数据库动态权限
      const allowed = await this.roleService.getAllowedRoles(
        controllerName,
        methodName,
      );
      allowedRoles = allowed.map((r) => r.name);
    }
    console.log(
      '[RoleGuard] requiredRoles:',
      requiredRoles,
      'allowedRoles:',
      allowedRoles,
    );
    if (!allowedRoles.length) {
      console.log('[RoleGuard] 无权限限制, 直接放行');
      return true; // 没有限制，直接放行
    }
    // 用户角色从数据库查
    const userRoles = await this.roleService.getUserRoles(user.sub);
    const userRoleNames = userRoles.map((r) => r.name);
    console.log('[RoleGuard] userRoleNames:', userRoleNames);
    if (!userRoleNames.some((role) => allowedRoles.includes(role))) {
      console.log(
        '[RoleGuard] 没有权限, userRoleNames:',
        userRoleNames,
        'allowedRoles:',
        allowedRoles,
      );
      throw new ForbiddenException('没有权限');
    }
    console.log('[RoleGuard] 权限校验通过');
    return true;
  }
}
