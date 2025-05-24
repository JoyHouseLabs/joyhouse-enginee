import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = this.extractTokenFromSocket(client);

      if (!token) {
        this.logger.warn(`WebSocket connection rejected: No token provided`);
        client.disconnect();
        return false;
      }

      // 验证JWT token
      const payload = this.jwtService.verify(token, {
        secret:
          this.configService.get<string>('JWT_SECRET') ||
          'your-super-secret-key-change-in-production',
      });

      // 获取用户信息
      const user = await this.userService.findById(payload.sub);
      if (!user) {
        this.logger.warn(
          `WebSocket connection rejected: User not found for ID ${payload.sub}`,
        );
        client.disconnect();
        return false;
      }

      // 将用户信息附加到socket对象上
      (client as any).user = user;

      this.logger.log(
        `WebSocket connection authenticated for user ${user.id} (${user.username})`,
      );
      return true;
    } catch (error) {
      this.logger.warn(`WebSocket authentication failed: ${error.message}`);
      const client: Socket = context.switchToWs().getClient();
      client.emit('auth-error', {
        message: 'Authentication failed',
        error: error.message,
      });
      client.disconnect();
      return false;
    }
  }

  private extractTokenFromSocket(client: Socket): string | null {
    // 尝试从多个位置获取token
    const authHeader = client.handshake.headers.authorization;
    const authQuery = client.handshake.query?.token;
    const authAuth = client.handshake.auth?.token;

    // 优先从Authorization header获取
    if (
      authHeader &&
      typeof authHeader === 'string' &&
      authHeader.startsWith('Bearer ')
    ) {
      return authHeader.slice(7);
    }

    // 从query参数获取
    if (authQuery && typeof authQuery === 'string') {
      return authQuery;
    }

    // 从auth对象获取
    if (authAuth && typeof authAuth === 'string') {
      return authAuth;
    }

    return null;
  }
}
