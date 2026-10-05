import { ApplicationService } from '@core/application/application-service.base';
import { SIGNATURE_PROVIDER } from '@core/contracts/signature-provider.contract';
import type { ISignatureProvider } from '@core/contracts/signature-provider.contract';
import { Result } from '@core/domain/result';
import { CredentialPayload } from '../../domain/value-objects/credential.vo';
import type { Registration } from '../../domain/entities/registration.entity';

export type BuildCredentialParams = { registration: Registration };
export type CredentialResult = { code: string; token: string; qrPayload: string; credentialUrl: string };
export type VerifyCredentialParams = { token: string };
export type VerifiedCredential = { code: string };

export type CredentialServiceDependencies = {
  signatureProvider: ISignatureProvider;
  credentialSecret: string;
  credentialBaseUrl: string;
};

/** Gera e valida credenciais de QR Code assinadas (§28). */
export class CredentialService extends ApplicationService<BuildCredentialParams, CredentialResult> {
  private readonly signatureProvider: ISignatureProvider;
  private readonly credentialSecret: string;
  private readonly credentialBaseUrl: string;

  constructor(dependencies: CredentialServiceDependencies) {
    super();
    this.signatureProvider = dependencies.signatureProvider;
    this.credentialSecret = dependencies.credentialSecret;
    this.credentialBaseUrl = dependencies.credentialBaseUrl;
  }

  async execute(params: BuildCredentialParams): Promise<Result<CredentialResult>> {
    const registration = params.registration;
    if (!registration.status.allowsCheckIn()) {
      return Result.fail(new Error('Credencial disponível somente para inscrições confirmadas'));
    }

    const signature = await this.signatureProvider.sign({
      payload: CredentialPayload.buildSignableContent({
        registrationId: registration.id.toString(),
        eventId: registration.eventId,
        code: registration.code.value,
      }),
      secret: this.credentialSecret,
    });

    const payloadResult = CredentialPayload.create({ code: registration.code.value, signature });
    if (payloadResult.isFailure) return Result.fail(payloadResult.error);

    const token = payloadResult.value.compile();
    return Result.ok({
      code: registration.code.value,
      token,
      qrPayload: token,
      credentialUrl: `${this.credentialBaseUrl}/${encodeURIComponent(token)}`,
    });
  }

  async verify(params: VerifyCredentialParams): Promise<Result<VerifiedCredential>> {
    const parsed = CredentialPayload.parse(params.token);
    if (parsed.isFailure) return Result.fail(parsed.error);

    const registrationResult = { code: parsed.value.code };
    return Result.ok(registrationResult);
  }

  /** Confere a assinatura da credencial contra o registro persistido. */
  async assertSignature(params: {
    code: string;
    signature: string;
    registrationId: string;
    eventId: string;
  }): Promise<boolean> {
    return this.signatureProvider.verify({
      payload: CredentialPayload.buildSignableContent({
        registrationId: params.registrationId,
        eventId: params.eventId,
        code: params.code,
      }),
      signature: params.signature,
      secret: this.credentialSecret,
    });
  }
}
