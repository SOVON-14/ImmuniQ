import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'required_permissions';
/** Exige l'une des permissions listées (code "ressource.action"). */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
