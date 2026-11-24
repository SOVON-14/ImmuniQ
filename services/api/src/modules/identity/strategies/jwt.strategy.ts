import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Session } from '../entities/session.entity';

export interface JwtPayload {
  sub: string;
  sid: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Session) private sessions: Repository<Session>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev-only-secret-change-me',
    });
  }

  async validate(payload: JwtPayload) {
    // La session doit exister et ne pas être révoquée.
    const session = await this.sessions.findOne({ where: { id: payload.sid } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session révoquée ou expirée');
    }
    const user = await this.users.findOne({
      where: { id: payload.sub },
      relations: ['role', 'role.permissions'],
    });
    if (!user) throw new UnauthorizedException();
    (user as any).sessionId = payload.sid;
    return user;
  }
}
