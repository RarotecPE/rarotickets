import type { Result } from '../../../../../@core/domain/result.ts';
import type { DomainError } from '../../../../../@core/domain/domain-error.base.ts';
import type {
  GeneratedCredentialToken,
  GenerateCredentialTokenParams,
  HashCredentialTokenParams,
  ICredentialTokenProvider,
} from '../../../domain/services/credential-token-provider.interface.ts';

export abstract class CredentialTokenProvider implements ICredentialTokenProvider {
  abstract generate(params: GenerateCredentialTokenParams): Promise<Result<GeneratedCredentialToken, DomainError>>;
  abstract hash(params: HashCredentialTokenParams): Promise<Result<string, DomainError>>;
}
