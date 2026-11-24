import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { User } from '../../modules/identity/entities/user.entity';
import { UserStatus } from '../../modules/identity/entities/user.entity';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ok = (await super.canActivate(context)) as boolean;
    if (!ok) return false;
    const request = context.switchToHttp().getRequest();
    const user = request.user as User;
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Compte inactif ou suspendu');
    }
    return true;
  }

  handleRequest(err: any, user: any) {
    if (err || !user) throw err ?? new UnauthorizedException();
    return user;
  }
}
