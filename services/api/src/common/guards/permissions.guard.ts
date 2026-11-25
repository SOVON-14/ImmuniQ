import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { User } from '../../modules/identity/entities/user.entity';

/**
 * RBAC : vérifie que l'utilisateur possède au moins une des permissions requises.
 * Le périmètre organisationnel (structure/territoire) est vérifié par les services
 * métier via ScopeService — ici on contrôle le droit fonctionnel.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest().user as User | undefined;
    if (!user?.role?.permissions) throw new ForbiddenException('Permissions indéterminées');

    const codes = new Set(user.role.permissions.map((p) => `${p.resource}.${p.action}`));
    // Wildcards : "ressource.*" couvre toutes les actions ; "*" couvre tout.
    const ok = required.some((code) => {
      if (codes.has(code) || codes.has('*') || codes.has('*.*')) return true;
      const [resource] = code.split('.');
      return codes.has(`${resource}.*`);
    });
    if (!ok) throw new ForbiddenException('Permission insuffisante');
    return true;
  }
}
