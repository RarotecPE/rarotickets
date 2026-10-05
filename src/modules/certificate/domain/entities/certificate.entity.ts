import { AggregateRoot } from '@core/domain/aggregate-root.base';
import type { EntityConstructorParams } from '@core/domain/entity.base';
import { Result } from '@core/domain/result';
import { CertificateNotEligibleError } from '../errors/certificate-not-eligible.error';
import { CertificateCode } from '../value-objects/certificate-code.vo';

export type CertificateStatusValue = 'EMITIDO' | 'CANCELADO';
export type CertificateStatusProps = { value: CertificateStatusValue };

export type CertificateProps = {
  code: CertificateCode;
  registrationId: string;
  participantId: string;
  eventId: string;
  participantName: string;
  participantCpf: string | null;
  eventTitle: string;
  workloadHours: number;
  activitiesSummary: string | null;
  status: CertificateStatusProps;
  issuedAt: Date;
  issuedBy: string | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  validationUrl: string;
};

export type CertificateConstructorParams = EntityConstructorParams<CertificateProps>;
export type ReconstituteCertificateParams = CertificateConstructorParams & {
  id: NonNullable<CertificateConstructorParams['id']>;
};

export type IssueCertificateParams = {
  registrationId: string;
  participantId: string;
  eventId: string;
  participantName: string;
  participantCpf: string | null;
  eventTitle: string;
  workloadHours: number;
  activitiesSummary?: string | null;
  issuedAt: Date;
  issuedBy?: string | null;
  validationBaseUrl: string;
};

/** Certificado do participante (§30 e §31). */
export class Certificate extends AggregateRoot<CertificateProps> {
  private constructor(params: CertificateConstructorParams) { super(params); }

  get code(): CertificateCode { return this.props.code; }
  get registrationId(): string { return this.props.registrationId; }
  get participantId(): string { return this.props.participantId; }
  get eventId(): string { return this.props.eventId; }
  get participantName(): string { return this.props.participantName; }
  get participantCpf(): string | null { return this.props.participantCpf; }
  get eventTitle(): string { return this.props.eventTitle; }
  get workloadHours(): number { return this.props.workloadHours; }
  get activitiesSummary(): string | null { return this.props.activitiesSummary; }
  get status(): CertificateStatusValue { return this.props.status.value; }
  get issuedAt(): Date { return this.props.issuedAt; }
  get issuedBy(): string | null { return this.props.issuedBy; }
  get cancelledAt(): Date | null { return this.props.cancelledAt; }
  get cancelReason(): string | null { return this.props.cancelReason; }
  get validationUrl(): string { return this.props.validationUrl; }

  public static issue(params: IssueCertificateParams): Result<Certificate> {
    if (!params.participantName) {
      return Result.fail(new CertificateNotEligibleError('Participante sem nome não pode receber certificado'));
    }
    if (params.workloadHours < 0) {
      return Result.fail(new CertificateNotEligibleError('Carga horária do certificado inválida'));
    }

    const code = CertificateCode.generate();
    return Result.ok(new Certificate({
      props: {
        code,
        registrationId: params.registrationId,
        participantId: params.participantId,
        eventId: params.eventId,
        participantName: params.participantName,
        participantCpf: params.participantCpf,
        eventTitle: params.eventTitle,
        workloadHours: params.workloadHours,
        activitiesSummary: params.activitiesSummary ?? null,
        status: { value: 'EMITIDO' },
        issuedAt: params.issuedAt,
        issuedBy: params.issuedBy ?? null,
        cancelledAt: null,
        cancelReason: null,
        validationUrl: `${params.validationBaseUrl.replace(/\/$/, '')}/${code.value}`,
      },
    }));
  }

  public static reconstitute(params: ReconstituteCertificateParams): Certificate {
    return new Certificate(params);
  }

  public isIssued(): boolean {
    return this.props.status.value === 'EMITIDO';
  }

  public cancel(params: { at: Date; reason: string }): Result<void> {
    if (!this.isIssued()) return Result.fail(new CertificateNotEligibleError('Certificado já está cancelado'));
    this.props.status = { value: 'CANCELADO' };
    this.props.cancelledAt = params.at;
    this.props.cancelReason = params.reason;
    this.touch();
    return Result.ok();
  }
}
