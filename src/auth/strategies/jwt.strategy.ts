import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../user/user.entity';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'joyhouse-secret',
      passReqToCallback: true,
    });
  }

  async validate(request: any, payload: any) {
    // 获取完整的 token
    const token = request.headers.authorization?.split(' ')[1];

    // 检查 token 是否在黑名单中
    if (token && (await this.authService.isTokenBlacklisted(token))) {
      throw new UnauthorizedException('Token 已被禁用');
    }

    const user = await this.userRepo.findOneBy({ id: payload.sub });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const { password, ...result } = user;
    return result;
  }
}
