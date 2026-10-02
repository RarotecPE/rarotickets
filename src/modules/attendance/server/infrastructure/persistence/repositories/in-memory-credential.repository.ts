import { ConflictError, NotFoundError } from '../../../../../../@core/domain/errors/domain-errors.ts';
import { Result } from '../../../../../../@core/domain/result.ts';
import { Credential } from '../../../../domain/entities/credential.entity.ts';
import { CredentialRepository } from '../../../../domain/repositories/credential-repository.base.ts';
import type { DomainError } from '../../../../../../@core/domain/domain-error.base.ts';
import type {
  CredentialByHashParams,
  CredentialByRegistrationParams,
  CredentialId,
  CreateCredentialIfUniqueParams,
} from '../../../../domain/repositories/credential-repository.interface.ts';

export type InMemoryCredentialRepositoryDependencies = { initialCredentials?: Credential[] };

/** Single-process reference adapter; use unique database constraints in production. */
export class InMemoryCredentialRepository extends CredentialRepository {
  private readonly credentials: Map<CredentialId, Credential>;

  constructor(dependencies: InMemoryCredentialRepositoryDependencies = {}) {
    super();
    this.credentials = new Map((dependencies.initialCredentials ?? []).map((credential) => [credential.id.toString(), credential]));
  }

  public async findById(id: CredentialId): Promise<Credential | null> {
    return this.credentials.get(id) ?? null;
  }

  public async findByRegistration(params: CredentialByRegistrationParams): Promise<Credential | null> {
    return [...this.credentials.values()].find((credential) => credential.registrationId === params.registrationId) ?? null;
  }

  public async findByTokenHash(params: CredentialByHashParams): Promise<Credential | null> {
    return [...this.credentials.values()].find((credential) => credential.tokenHash === params.tokenHash) ?? null;
  }

  public async createIfUnique(params: CreateCredentialIfUniqueParams): Promise<Result<Credential, DomainError>> {
    const duplicateRegistration = [...this.credentials.values()].some((credential) => credential.registrationId === params.credential.registrationId);
    const duplicateHash = [...this.credentials.values()].some((credential) => credential.tokenHash === params.credential.tokenHash);
    if (duplicateRegistration || duplicateHash || this.credentials.has(params.credential.id.toString())) {
      return Result.fail(new ConflictError({ code: 'CREDENTIAL_NOT_UNIQUE', message: 'A credencial ou inscrição já possui uma credencial.' }));
    }
    this.credentials.set(params.credential.id.toString(), params.credential);
    return Result.ok(params.credential);
  }

  public async save(credential: Credential): Promise<Result<void, DomainError>> {
    const id = credential.id.toString();
    if (!this.credentials.has(id)) {
      return Result.fail(new NotFoundError({ code: 'CREDENTIAL_NOT_FOUND', message: 'Credencial não encontrada.' }));
    }
    const duplicatedHash = [...this.credentials.values()].some((candidate) => candidate.id.toString() !== id
      && candidate.tokenHash === credential.tokenHash);
    if (duplicatedHash) {
      return Result.fail(new ConflictError({ code: 'CREDENTIAL_HASH_CONFLICT', message: 'O hash da credencial já está vinculado a outro registro.' }));
    }
    this.credentials.set(id, credential);
    return Result.ok();
  }
}
