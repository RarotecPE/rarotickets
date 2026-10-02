import type { Result } from '../../../../@core/domain/result.ts';
import type { DomainError } from '../../../../@core/domain/domain-error.base.ts';
import type { Credential } from '../entities/credential.entity.ts';
import type {
  CredentialByHashParams,
  CredentialByRegistrationParams,
  CredentialId,
  CreateCredentialIfUniqueParams,
  ICredentialRepository,
} from './credential-repository.interface.ts';

export abstract class CredentialRepository implements ICredentialRepository {
  abstract findById(id: CredentialId): Promise<Credential | null>;
  abstract findByRegistration(params: CredentialByRegistrationParams): Promise<Credential | null>;
  abstract findByTokenHash(params: CredentialByHashParams): Promise<Credential | null>;
  abstract createIfUnique(params: CreateCredentialIfUniqueParams): Promise<Result<Credential, DomainError>>;
  abstract save(credential: Credential): Promise<Result<void, DomainError>>;
}
