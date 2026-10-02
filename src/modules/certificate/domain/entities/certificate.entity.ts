import { Entity } from '../../../../@core/domain/entity.base.ts';
import type { EntityConstructorParams } from '../../../../@core/domain/entity.base.ts';
import { Identifier } from '../../../../@core/domain/identifier.ts';
import { Result } from '../../../../@core/domain/result.ts';
import { InvalidStateError, ValidationError } from '../../../../@core/domain/errors/domain-errors.ts';

export type CertificateProps = {
  eventId: string;
  registrationId: string;
  participantId: string;
  validationCode: string;
  workloadMinutes: number | null;
  text: string | null;
  templateId: string | null;
  issuedAt: Date;
  revokedAt: Date | null;
  revocationReason: string | null;
};
export type CreateCertificateParams = CertificateProps & { id?: string };
export type RevokeCertificateParams = { reason: string; now: Date };
export type ValidateCertificateParams = { validationCode: string };
export type CertificateSnapshot = CertificateProps & { id: string; createdAt: Date; updatedAt: Date };

export class Certificate extends Entity<CertificateProps> {
  private constructor(params: EntityConstructorParams<CertificateProps>) {
    super(params);
  }

  public static create(params: CreateCertificateParams): Result<Certificate, ValidationError> {
    const invalid = !params.eventId.trim() || !params.registrationId.trim() || !params.participantId.trim()
      || params.validationCode.trim().length < 32
      || (params.workloadMinutes !== null && (!Number.isSafeInteger(params.workloadMinutes) || params.workloadMinutes <= 0));
    if (invalid) {
      return Result.fail(new ValidationError({ code: 'CERTIFICATE_INVALID', message: 'Certificado, vínculo ou código de validação inválido.' }));
    }
    const props: CertificateProps = {
      eventId: params.eventId,
      registrationId: params.registrationId,
      participantId: params.participantId,
      validationCode: params.validationCode,
      workloadMinutes: params.workloadMinutes,
      text: params.text?.trim() || null,
      templateId: params.templateId?.trim() || null,
      issuedAt: new Date(params.issuedAt.getTime()),
      revokedAt: params.revokedAt ? new Date(params.revokedAt.getTime()) : null,
      revocationReason: params.revocationReason?.trim() || null,
    };
    const entityParams: EntityConstructorParams<CertificateProps> = {
      props,
      createdAt: params.issuedAt,
      updatedAt: params.issuedAt,
    };
    if (params.id) entityParams.id = Identifier.fromExisting(params.id);
    return Result.ok(new Certificate(entityParams));
  }

  public get eventId(): string { return this.props.eventId; }
  public get registrationId(): string { return this.props.registrationId; }
  public get participantId(): string { return this.props.participantId; }
  public get validationCode(): string { return this.props.validationCode; }
  public get workloadMinutes(): number | null { return this.props.workloadMinutes; }
  public get text(): string | null { return this.props.text; }
  public get templateId(): string | null { return this.props.templateId; }
  public get issuedAt(): Date { return new Date(this.props.issuedAt.getTime()); }
  public get revokedAt(): Date | null { return this.props.revokedAt ? new Date(this.props.revokedAt.getTime()) : null; }
  public get revocationReason(): string | null { return this.props.revocationReason; }

  public isAuthentic(params: ValidateCertificateParams): boolean {
    return this.props.validationCode === params.validationCode && this.props.revokedAt === null;
  }

  public revoke(params: RevokeCertificateParams): Result<boolean, ValidationError | InvalidStateError> {
    if (!params.reason.trim()) {
      return Result.fail(new ValidationError({ code: 'CERTIFICATE_REVOCATION_REASON_REQUIRED', message: 'Informe o motivo da revogação do certificado.' }));
    }
    if (this.props.revokedAt) return Result.ok(false);
    this.props.revokedAt = new Date(params.now.getTime());
    this.props.revocationReason = params.reason.trim();
    this.touch({ at: params.now });
    return Result.ok(true);
  }

  public snapshot(): CertificateSnapshot {
    return {
      ...this.props,
      issuedAt: this.issuedAt,
      revokedAt: this.revokedAt,
      id: this.id.toString(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
