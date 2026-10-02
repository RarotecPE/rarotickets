import type { Result } from '../../../../@core/domain/result.ts';
import type { DomainError } from '../../../../@core/domain/domain-error.base.ts';
import type { Credential } from '../entities/credential.entity.ts';

export type CredentialId = string;
export type CreateCredentialIfUniqueParams = { credential: Credential };
export type CredentialByRegistrationParams = { registrationId: string };
export type CredentialByHashParams = { tokenHash: string };

export interface ICredentialRepository {
  findById(id: CredentialId): Promise<Credential | null>;
  findByRegistration(params: CredentialByRegistrationParams): Promise<Credential | null>;
  findByTokenHash(params: CredentialByHashParams): Promise<Credential | null>;
  createIfUnique(params: CreateCredentialIfUniqueParams): Promise<Result<Credential, DomainError>>;
  save(credential: Credential): Promise<Result<void, DomainError>>;
}
