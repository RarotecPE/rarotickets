import type { Result } from '../../../../@core/domain/result.ts';
import type { DomainError } from '../../../../@core/domain/domain-error.base.ts';

export type GeneratedCredentialToken = { token: string; tokenHash: string };
export type GenerateCredentialTokenParams = { registrationId: string };
export type HashCredentialTokenParams = { token: string };

export interface ICredentialTokenProvider {
  generate(params: GenerateCredentialTokenParams): Promise<Result<GeneratedCredentialToken, DomainError>>;
  hash(params: HashCredentialTokenParams): Promise<Result<string, DomainError>>;
}
