import { DomainError } from '../../../../../@core/domain/domain-error.base.ts';
import { Result } from '../../../../../@core/domain/result.ts';
import { CredentialTokenProvider } from './credential-token-provider.base.ts';
import type {
  GeneratedCredentialToken,
  GenerateCredentialTokenParams,
  HashCredentialTokenParams,
} from '../../../domain/services/credential-token-provider.interface.ts';

const CREDENTIAL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Uses the server runtime's Web Crypto implementation; raw tokens are never persisted here. */
export class WebCryptoCredentialTokenProvider extends CredentialTokenProvider {
  public async generate(params: GenerateCredentialTokenParams): Promise<Result<GeneratedCredentialToken, DomainError>> {
    if (!params.registrationId.trim()) {
      return Result.fail(new DomainError({ code: 'CREDENTIAL_REGISTRATION_REQUIRED', message: 'A credencial precisa estar vinculada a uma inscrição.' }));
    }
    try {
      const randomBytes = new Uint8Array(32);
      globalThis.crypto.getRandomValues(randomBytes);
      const token = Array.from(randomBytes, (value) => CREDENTIAL_ALPHABET.charAt(value & 63)).join('');
      const tokenHash = await this.hashToken({ token });
      return Result.ok({ token, tokenHash });
    } catch {
      return Result.fail(new DomainError({ code: 'CREDENTIAL_CRYPTO_FAILURE', message: 'Não foi possível gerar a credencial segura.' }));
    }
  }

  public async hash(params: HashCredentialTokenParams): Promise<Result<string, DomainError>> {
    if (params.token.length < 32) {
      return Result.fail(new DomainError({ code: 'CREDENTIAL_TOKEN_INVALID', message: 'A credencial informada é inválida.' }));
    }
    try {
      return Result.ok(await this.hashToken(params));
    } catch {
      return Result.fail(new DomainError({ code: 'CREDENTIAL_CRYPTO_FAILURE', message: 'Não foi possível validar a credencial.' }));
    }
  }

  private async hashToken(params: HashCredentialTokenParams): Promise<string> {
    const bytes = new TextEncoder().encode(params.token);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
  }
}
