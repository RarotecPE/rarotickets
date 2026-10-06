import { describe, expect, it } from 'vitest';
import { ApplicationRole } from './application-role.vo';

describe('ApplicationRole', () => {
  it('mapeia o perfil RaroNexus para permissões locais conhecidas', () => {
    const roleResult = ApplicationRole.create({ key: 'GERENTE_EVENTO' });

    expect(roleResult.isSuccess).toBe(true);
    expect(roleResult.value.can({ permission: 'events:create' })).toBe(true);
    expect(roleResult.value.can({ permission: 'finance:read' })).toBe(false);
  });

  it('nega perfis desconhecidos em vez de conceder acesso padrão', () => {
    const roleResult = ApplicationRole.create({ key: 'SUPERUSER' });

    expect(roleResult.isFailure).toBe(true);
    expect(roleResult.error.code).toBe('UNKNOWN_APPLICATION_ROLE');
  });
});
