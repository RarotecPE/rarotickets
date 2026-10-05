import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';

export type CredentialPayloadProps = { code: string; signature: string };

export const CREDENTIAL_SEPARATOR = '::';

/**
 * Credencial do participante usada no QR Code (§28): composta pelo código de
 * inscrição e uma assinatura — nunca por um identificador sequencial interno.
 */
export class CredentialPayload extends ValueObject<CredentialPayloadProps> {
  private constructor(props: CredentialPayloadProps) {
    super(props);
  }

  get code(): string { return this.props.code; }
  get signature(): string { return this.props.signature; }

  public static create(params: CredentialPayloadProps): Result<CredentialPayload> {
    if (!params.code) return Result.fail(new Error('Credencial sem código de inscrição'));
    if (!params.signature) return Result.fail(new Error('Credencial sem assinatura'));
    return Result.ok(new CredentialPayload({ code: params.code, signature: params.signature }));
  }

  /** Payload textual embutido no QR Code. */
  public compile(): string {
    return `${this.props.code}${CREDENTIAL_SEPARATOR}${this.props.signature}`;
  }

  public static parse(raw: string): Result<CredentialPayload> {
    const separatorIndex = (raw ?? '').indexOf(CREDENTIAL_SEPARATOR);
    if (separatorIndex <= 0) return Result.fail(new Error('Credencial inválida'));

    const code = raw.slice(0, separatorIndex).trim();
    const signature = raw.slice(separatorIndex + CREDENTIAL_SEPARATOR.length).trim();
    if (!code || !signature) return Result.fail(new Error('Credencial inválida'));

    return CredentialPayload.create({ code, signature });
  }

  /** Mensagem assinada: vínculo entre inscrição, evento e código. */
  public static buildSignableContent(params: { registrationId: string; eventId: string; code: string }): string {
    return `credential:v1:${params.code}:${params.eventId}:${params.registrationId}`;
  }
}
