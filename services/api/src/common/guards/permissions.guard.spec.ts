import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

function guardFor(required?: string[]) {
  const reflector = {
    getAllAndOverride: jest.fn().mockImplementation((key: string) =>
      key === PERMISSIONS_KEY ? required : undefined),
  } as unknown as Reflector;
  return new PermissionsGuard(reflector);
}

function makeCtx(user: any): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

const userWith = (...codes: string[]) => ({
  id: 'u1',
  role: { permissions: codes.map((c) => {
    const [resource, action] = c.split('.');
    return { resource, action };
  }) },
});

describe('PermissionsGuard', () => {
  it('autorise si aucune permission requise', () => {
    const guard = guardFor(undefined);
    expect(guard.canActivate(makeCtx(userWith()))).toBe(true);
  });

  it('autorise sur permission exacte', () => {
    const guard = guardFor(['act.create']);
    expect(guard.canActivate(makeCtx(userWith('act.create', 'act.read')))).toBe(true);
  });

  it('autorise via wildcard ressource.*', () => {
    const guard = guardFor(['act.validate']);
    expect(guard.canActivate(makeCtx(userWith('act.*')))).toBe(true);
  });

  it('autorise via wildcard global *.*', () => {
    const guard = guardFor(['stock.adjust']);
    expect(guard.canActivate(makeCtx(userWith('*.*')))).toBe(true);
  });

  it('refuse si permission manquante', () => {
    const guard = guardFor(['admin.settings']);
    expect(() => guard.canActivate(makeCtx(userWith('act.read')))).toThrow(ForbiddenException);
  });

  it('refuse si role/permissions absents', () => {
    const guard = guardFor(['act.read']);
    expect(() => guard.canActivate(makeCtx({ id: 'u1' }))).toThrow(ForbiddenException);
  });

  it('accepte l’une des permissions listées (OU)', () => {
    const guard = guardFor(['act.update', 'act.create']);
    expect(guard.canActivate(makeCtx(userWith('act.create')))).toBe(true);
  });

  it('ne matche pas un préfixe de ressource différent', () => {
    const guard = guardFor(['act.read']);
    expect(() => guard.canActivate(makeCtx(userWith('activity.read')))).toThrow(ForbiddenException);
  });
});
