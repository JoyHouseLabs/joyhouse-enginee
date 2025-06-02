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
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  private extractTokenFromSocket(client: Socket): string | null {
    // 1. 从 auth 对象中获取
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }

    // 2. 从 query 参数中获取
    if (client.handshake.query?.token) {
      return client.handshake.query.token as string;
    }

    // 3. 从 headers 中获取
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      
      // 记录握手信息
      this.logger.log('WebSocket handshake info:', {
        headers: client.handshake.headers,
        query: client.handshake.query,
        auth: client.handshake.auth,
      });

      const token = this.extractTokenFromSocket(client);

      if (!token) {
        this.logger.log(`WebSocket connection rejected: No token provided`, {
          handshake: {
            headers: client.handshake.headers,
            query: client.handshake.query,
            auth: client.handshake.auth,
          }
        });
        client.disconnect();
        return false;
      }

      this.logger.log('Extracted token:', {
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 10) + '...',
      });

      // 验证JWT token
      const payload = this.jwtService.verify(token, {
        secret:
          this.configService.get<string>('JWT_SECRET') ||
          'your-super-secret-key-change-in-production',
      });

      this.logger.log('JWT payload:', payload);

      // 获取用户信息
      const user = await this.userService.findById(payload.sub);
      if (!user) {
        this.logger.log(
          `WebSocket connection rejected: User not found for ID ${payload.sub}`,
          {
            payload,
            handshake: {
              headers: client.handshake.headers,
              query: client.handshake.query,
              auth: client.handshake.auth,
            }
          }
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
      this.logger.error(`WebSocket authentication error: ${error.message}`, {
        error,
        handshake: context.switchToWs().getClient().handshake,
      });
      context.switchToWs().getClient().disconnect();
      return false;
    }
  }
}
