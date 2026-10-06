import { randomBytes } from 'node:crypto';
import { ApplicationRole } from '../../../domain/value-objects/application-role.vo';
import { GlobalIdentity } from '../../../domain/value-objects/global-identity.vo';
import { AuthSession } from '../../../domain/entities/auth-session.entity';
import { AuthSessionMapper } from '../../../application/mappers/auth-session.mapper';
import type { AuthSessionDto } from '../../../application/types/auth-session.types';

export type DemoSessionRegistryDependencies = { mapper: AuthSessionMapper };
export type DemoSession = { token: string; session: AuthSessionDto };

export class DemoSessionRegistry {
  private readonly mapper: AuthSessionMapper;
  private readonly sessions = new Map<string, AuthSessionDto>();

  constructor(dependencies: DemoSessionRegistryDependencies) {
    this.mapper = dependencies.mapper;
  }

  create(): DemoSession {
    const userResult = GlobalIdentity.create({
      id: 'demo-admin',
      name: 'Sofia Martins',
      email: 'sofia.martins@rarotickets.demo',
      avatarUrl: null,
    });
    const roleResult = ApplicationRole.create({ key: 'ADMINISTRADOR' });
    if (userResult.isFailure || roleResult.isFailure) throw new Error('Não foi possível iniciar a demonstração.');
    const sessionResult = AuthSession.create({ user: userResult.value, role: roleResult.value });
    if (sessionResult.isFailure) throw new Error('Não foi possível iniciar a demonstração.');
    const token = randomBytes(32).toString('hex');
    const sessionDto = this.mapper.map({ session: sessionResult.value });
    this.sessions.set(token, sessionDto);
    return { token, session: sessionDto };
  }

  find(token: string): AuthSessionDto | null {
    return this.sessions.get(token) ?? null;
  }

  revoke(token: string): boolean {
    return this.sessions.delete(token);
  }
}
