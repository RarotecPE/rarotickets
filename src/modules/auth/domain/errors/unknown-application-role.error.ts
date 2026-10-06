import { DomainError } from '../../../../@core/domain/errors/domain-error.base';

export type UnknownApplicationRoleErrorParams = { roleKey: string };

export class UnknownApplicationRoleError extends DomainError {
  constructor(params: UnknownApplicationRoleErrorParams) {
    super({
      code: 'UNKNOWN_APPLICATION_ROLE',
      message: `O perfil "${params.roleKey}" não possui acesso cadastrado ao RaroTickets.`,
    });
  }
}
