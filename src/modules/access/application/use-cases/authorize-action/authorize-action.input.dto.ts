import type { RoleGrant } from '../../../domain/services/authorize-action.service.ts';

export type AuthorizeActionInputDto = {
  actorId: string;
  permission: string;
  roleGrants: RoleGrant[];
};
