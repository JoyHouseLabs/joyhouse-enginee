import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('缺少或无效的token');
    }
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(
        token,
        process.env.JWT_SECRET || 'joyhouse-secret',
      );
      (request as any).user = payload;
      return true;
    } catch (e) {
      throw new UnauthorizedException('token无效或已过期');
    }
  }
}
